const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { CORS_ORIGIN, JWT_SECRET } = require('../config');
const { GameMatch, User } = require('../models');
const { plain } = require('../utils/http');

const GAME_TYPES = {
  target: { label: 'Target Rush', seconds: 30 },
  math: { label: 'Brain Blitz', seconds: 45 },
  memory: { label: 'Memory Ladder', seconds: 45 }
};

const liveMatches = new Map();

function userRoom(username) {
  return `user:${username}`;
}

function matchRoom(id) {
  return `game:${id}`;
}

function publicMatch(match) {
  const payload = plain(match);
  payload.challenger_score = payload.challenger_score ?? null;
  payload.opponent_score = payload.opponent_score ?? null;
  payload.game_type = payload.game_type || 'target';
  return payload;
}

function isParticipant(match, username) {
  return [match.challenger_username, match.opponent_username].includes(username);
}

function nextRandom(seed, turn) {
  const hash = crypto.createHash('sha256').update(`${seed}:${turn}`).digest();
  return hash[0] * 256 + hash[1];
}

function mathPrompt(seed, username, turn) {
  const value = nextRandom(`${seed}:${username}:math`, turn);
  const a = 4 + (value % 18);
  const b = 2 + ((value >> 3) % 12);
  const op = value % 3 === 0 ? 'x' : value % 3 === 1 ? '+' : '-';
  const answer = op === 'x' ? a * b : op === '+' ? a + b : a - b;
  return { kind: 'math', turn, question: `${a} ${op} ${b}`, answer };
}

function memoryPrompt(seed, username, turn) {
  const colors = ['Orange', 'Mint', 'Gold', 'Red'];
  const length = Math.min(7, 3 + turn);
  const sequence = Array.from({ length }, (_, index) => colors[nextRandom(`${seed}:${username}:memory`, turn + index) % colors.length]);
  return { kind: 'memory', turn, sequence };
}

function promptFor(type, match, username, turn) {
  if (type === 'math') return mathPrompt(match.seed, username, turn);
  if (type === 'memory') return memoryPrompt(match.seed, username, turn);
  return null;
}

function clientPrompt(prompt) {
  if (!prompt) return null;
  const { answer, ...safePrompt } = prompt;
  return safePrompt;
}

function stateFor(match, state) {
  return {
    match: publicMatch(match),
    live: true,
    ends_at: state.endsAt,
    scores: Object.fromEntries(Object.entries(state.players).map(([username, player]) => [username, player.score])),
    streaks: Object.fromEntries(Object.entries(state.players).map(([username, player]) => [username, player.streak]))
  };
}

async function emitPrompts(io, match, state) {
  const sockets = await io.in(matchRoom(match.id)).fetchSockets();
  sockets.forEach((socket) => {
    const username = socket.user?.user;
    socket.emit('game:prompt', clientPrompt(state.players[username]?.prompt));
  });
}

function finishMatch(io, match, state) {
  if (!liveMatches.has(match.id)) return;
  liveMatches.delete(match.id);
  const challengerScore = state.players[match.challenger_username]?.score || 0;
  const opponentScore = state.players[match.opponent_username]?.score || 0;
  const winner = challengerScore === opponentScore
    ? null
    : challengerScore > opponentScore
      ? match.challenger_username
      : match.opponent_username;

  match.update({
    status: 'Completed',
    challenger_score: challengerScore,
    opponent_score: opponentScore,
    winner_username: winner,
    completed_at: new Date()
  }).then((updated) => {
    const payload = publicMatch(updated);
    io.to(matchRoom(match.id)).emit('game:finished', payload);
    io.to(userRoom(match.challenger_username)).emit('game:match-updated', payload);
    io.to(userRoom(match.opponent_username)).emit('game:match-updated', payload);
  }).catch((error) => {
    io.to(matchRoom(match.id)).emit('game:error', { error: error.message || 'Could not finish game' });
  });
}

function attachGameSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((origin) => origin.trim())
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing token');
      socket.user = jwt.verify(token, JWT_SECRET);
      return next();
    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const username = socket.user.user;
    socket.join(userRoom(username));

    const ack = (callback, payload) => {
      if (typeof callback === 'function') callback(payload);
    };

    socket.on('game:create', async (payload = {}, callback) => {
      try {
        const opponent = String(payload.opponent_username || '').trim();
        const gameType = GAME_TYPES[payload.game_type] ? payload.game_type : 'target';
        if (!opponent || opponent === username) throw new Error('Choose another user to challenge');
        const opponentUser = await User.findOne({ where: { username: opponent } });
        if (!opponentUser) throw new Error('Opponent not found');

        const match = await GameMatch.create({
          challenger_username: username,
          opponent_username: opponent,
          seed: crypto.randomBytes(8).toString('hex'),
          game_type: gameType,
          status: 'Pending'
        });
        const publicPayload = publicMatch(match);
        socket.join(matchRoom(match.id));
        io.to(userRoom(username)).emit('game:match-updated', publicPayload);
        io.to(userRoom(opponent)).emit('game:match-updated', publicPayload);
        ack(callback, { ok: true, match: publicPayload });
      } catch (error) {
        ack(callback, { ok: false, error: error.message || 'Could not create game' });
      }
    });

    socket.on('game:accept', async ({ id } = {}, callback) => {
      try {
        const match = await GameMatch.findByPk(Number(id));
        if (!match || !isParticipant(match, username)) throw new Error('Game match not found');
        if (match.opponent_username !== username) throw new Error('Only the opponent can accept this match');
        if (match.status !== 'Pending') throw new Error('This match is no longer pending');
        await match.update({ status: 'Active' });
        const publicPayload = publicMatch(match);
        socket.join(matchRoom(match.id));
        io.to(userRoom(match.challenger_username)).emit('game:match-updated', publicPayload);
        io.to(userRoom(match.opponent_username)).emit('game:match-updated', publicPayload);
        io.to(matchRoom(match.id)).emit('game:ready', publicPayload);
        ack(callback, { ok: true, match: publicPayload });
      } catch (error) {
        ack(callback, { ok: false, error: error.message || 'Could not accept game' });
      }
    });

    socket.on('game:join', async ({ id } = {}, callback) => {
      try {
        const match = await GameMatch.findByPk(Number(id));
        if (!match || !isParticipant(match, username)) throw new Error('Game match not found');
        socket.join(matchRoom(match.id));
        const state = liveMatches.get(match.id);
        if (state) {
          socket.emit('game:state', stateFor(match, state));
          socket.emit('game:prompt', clientPrompt(state.players[username]?.prompt));
        }
        ack(callback, { ok: true, match: publicMatch(match), live: Boolean(state) });
      } catch (error) {
        ack(callback, { ok: false, error: error.message || 'Could not join game' });
      }
    });

    socket.on('game:start', async ({ id } = {}, callback) => {
      try {
        const match = await GameMatch.findByPk(Number(id));
        if (!match || !isParticipant(match, username)) throw new Error('Game match not found');
        if (!['Pending', 'Active'].includes(match.status)) throw new Error('This match cannot be started');
        if (match.status === 'Pending' && match.challenger_username !== username) throw new Error('Accept the match first');

        if (match.status === 'Pending') await match.update({ status: 'Active' });
        const seconds = GAME_TYPES[match.game_type || 'target']?.seconds || 30;
        let state = liveMatches.get(match.id);
        if (!state) {
          state = {
            endsAt: Date.now() + seconds * 1000,
            timer: null,
            players: {
              [match.challenger_username]: { score: 0, streak: 0, turn: 0, prompt: promptFor(match.game_type, match, match.challenger_username, 0) },
              [match.opponent_username]: { score: 0, streak: 0, turn: 0, prompt: promptFor(match.game_type, match, match.opponent_username, 0) }
            }
          };
          state.timer = setTimeout(() => finishMatch(io, match, state), seconds * 1000 + 250);
          liveMatches.set(match.id, state);
        }

        socket.join(matchRoom(match.id));
        const publicPayload = publicMatch(match);
        io.to(userRoom(match.challenger_username)).emit('game:match-updated', publicPayload);
        io.to(userRoom(match.opponent_username)).emit('game:match-updated', publicPayload);
        io.to(matchRoom(match.id)).emit('game:state', stateFor(match, state));
        io.to(matchRoom(match.id)).emit('game:started', stateFor(match, state));
        await emitPrompts(io, match, state);
        ack(callback, { ok: true, state: stateFor(match, state) });
      } catch (error) {
        ack(callback, { ok: false, error: error.message || 'Could not start game' });
      }
    });

    socket.on('game:action', async ({ id, action } = {}, callback) => {
      try {
        const match = await GameMatch.findByPk(Number(id));
        if (!match || !isParticipant(match, username)) throw new Error('Game match not found');
        const state = liveMatches.get(match.id);
        if (!state || Date.now() > state.endsAt) throw new Error('No live round is running');

        const type = match.game_type || 'target';
        const player = state.players[username];
        let awarded = 0;

        if (type === 'target' && action?.kind === 'hit') {
          player.streak += 1;
          awarded = 10 + Math.min(player.streak, 10);
        }

        if (type === 'math' && action?.kind === 'answer') {
          const answer = Number(action.answer);
          if (Number.isFinite(answer) && answer === player.prompt?.answer) {
            player.streak += 1;
            awarded = 25 + Math.min(player.streak * 3, 30);
          } else {
            player.streak = 0;
          }
          player.turn += 1;
          player.prompt = promptFor(type, match, username, player.turn);
          socket.emit('game:prompt', clientPrompt(player.prompt));
        }

        if (type === 'memory' && action?.kind === 'sequence') {
          const submitted = Array.isArray(action.sequence) ? action.sequence.join('|') : '';
          const expected = player.prompt?.sequence?.join('|');
          if (submitted === expected) {
            player.streak += 1;
            awarded = 35 + Math.min(player.streak * 5, 40);
          } else {
            player.streak = 0;
          }
          player.turn += 1;
          player.prompt = promptFor(type, match, username, player.turn);
          socket.emit('game:prompt', clientPrompt(player.prompt));
        }

        player.score += awarded;
        io.to(matchRoom(match.id)).emit('game:state', stateFor(match, state));
        ack(callback, { ok: true, awarded, score: player.score });
      } catch (error) {
        ack(callback, { ok: false, error: error.message || 'Could not score action' });
      }
    });

    socket.on('disconnect', () => {
      socket.leave(userRoom(username));
    });
  });

  return io;
}

module.exports = attachGameSocket;
