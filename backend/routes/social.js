const express = require('express');
const crypto = require('crypto');
const { Challenge, GameMatch, LearningSession, Op, User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { plain, route } = require('../utils/http');

const router = express.Router();
const GAME_TYPES = ['target', 'math', 'memory'];

function matchPayload(match) {
  const payload = plain(match);
  payload.challenger_score = payload.challenger_score ?? null;
  payload.opponent_score = payload.opponent_score ?? null;
  return payload;
}

function isParticipant(match, username) {
  return [match.challenger_username, match.opponent_username].includes(username);
}

router.get('/leaderboard', requireAuth, route(async (req, res) => {
  const users = await User.findAll({ attributes: ['username', 'display_name', 'game_handle'] });
  const learningSessions = await LearningSession.findAll();
  const challenges = await Challenge.findAll({ where: { status: 'Completed' } });
  const games = await GameMatch.findAll({ where: { status: 'Completed' } });

  const rows = users.map((user) => {
    const username = user.username;
    const sessions = learningSessions.filter((item) => item.user_username === username);
    const minutes = sessions.reduce((sum, item) => sum + Number(item.actual_duration || 0) * 60, 0);
    const completedSessions = sessions.filter((item) => item.completed).length;
    const challengeWins = challenges.filter((item) => item.winner_username === username).length;
    const userGames = games.filter((item) => isParticipant(item, username));
    const gameWins = games.filter((item) => item.winner_username === username).length;
    const gameScore = userGames.reduce((sum, item) => {
      const isChallenger = item.challenger_username === username;
      return sum + Number(isChallenger ? item.challenger_score || 0 : item.opponent_score || 0);
    }, 0);
    const score = Math.round(minutes + completedSessions * 25 + challengeWins * 100 + gameWins * 150 + gameScore);
    return {
      username,
      display_name: user.game_handle || user.display_name || username,
      learning_minutes: Math.round(minutes),
      completed_sessions: completedSessions,
      challenge_wins: challengeWins,
      game_score: gameScore,
      game_wins: gameWins,
      score
    };
  }).sort((a, b) => b.score - a.score);

  return res.json(rows);
}));

router.get('/challenges', requireAuth, route(async (req, res) => {
  const challenges = await Challenge.findAll({
    where: {
      [Op.or]: [
        { challenger_username: req.user.user },
        { opponent_username: req.user.user }
      ]
    },
    order: [['created_at', 'DESC']]
  });
  return res.json(challenges.map(plain));
}));

router.post('/challenges', requireAuth, route(async (req, res) => {
  const opponent = String(req.body?.opponent_username || '').trim();
  if (!opponent || opponent === req.user.user) return res.status(400).json({ error: 'Choose another user to challenge' });
  const opponentUser = await User.findOne({ where: { username: opponent } });
  if (!opponentUser) return res.status(404).json({ error: 'Opponent not found' });

  const challenge = await Challenge.create({
    challenger_username: req.user.user,
    opponent_username: opponent,
    type: String(req.body?.type || 'Learning'),
    target: String(req.body?.target || ''),
    status: 'Pending'
  });

  return res.status(201).json(plain(challenge));
}));

router.patch('/challenges/:id', requireAuth, route(async (req, res) => {
  const challenge = await Challenge.findByPk(Number(req.params.id));
  if (!challenge || ![challenge.challenger_username, challenge.opponent_username].includes(req.user.user)) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  const status = String(req.body?.status || challenge.status);
  const patch = { status };
  if (status === 'Completed') {
    patch.winner_username = String(req.body?.winner_username || req.user.user);
    patch.completed_at = new Date();
  }

  await challenge.update(patch);
  return res.json(plain(challenge));
}));

router.get('/game/matches', requireAuth, route(async (req, res) => {
  const matches = await GameMatch.findAll({
    where: {
      [Op.or]: [
        { challenger_username: req.user.user },
        { opponent_username: req.user.user }
      ]
    },
    order: [['created_at', 'DESC']]
  });

  return res.json(matches.map(matchPayload));
}));

router.post('/game/matches', requireAuth, route(async (req, res) => {
  const opponent = String(req.body?.opponent_username || '').trim();
  if (!opponent || opponent === req.user.user) return res.status(400).json({ error: 'Choose another user to challenge' });

  const opponentUser = await User.findOne({ where: { username: opponent } });
  if (!opponentUser) return res.status(404).json({ error: 'Opponent not found' });

  const match = await GameMatch.create({
    challenger_username: req.user.user,
    opponent_username: opponent,
    seed: crypto.randomBytes(8).toString('hex'),
    game_type: GAME_TYPES.includes(req.body?.game_type) ? req.body.game_type : 'target',
    status: 'Pending'
  });

  return res.status(201).json(matchPayload(match));
}));

router.patch('/game/matches/:id/accept', requireAuth, route(async (req, res) => {
  const match = await GameMatch.findByPk(Number(req.params.id));
  if (!match || !isParticipant(match, req.user.user)) return res.status(404).json({ error: 'Game match not found' });
  if (match.opponent_username !== req.user.user) return res.status(403).json({ error: 'Only the opponent can accept this match' });
  if (match.status !== 'Pending') return res.status(400).json({ error: 'This match is no longer pending' });

  await match.update({ status: 'Active' });
  return res.json(matchPayload(match));
}));

router.post('/game/matches/:id/score', requireAuth, route(async (req, res) => {
  const match = await GameMatch.findByPk(Number(req.params.id));
  if (!match || !isParticipant(match, req.user.user)) return res.status(404).json({ error: 'Game match not found' });
  if (match.status === 'Completed') return res.status(400).json({ error: 'This match is already complete' });

  const score = Number(req.body?.score);
  if (!Number.isFinite(score) || score < 0 || score > 5000) return res.status(400).json({ error: 'Invalid score' });

  const patch = { status: match.status === 'Pending' ? 'Active' : match.status };
  if (match.challenger_username === req.user.user) {
    if (match.challenger_score !== null && match.challenger_score !== undefined) return res.status(400).json({ error: 'Score already submitted' });
    patch.challenger_score = Math.round(score);
  } else {
    if (match.opponent_score !== null && match.opponent_score !== undefined) return res.status(400).json({ error: 'Score already submitted' });
    patch.opponent_score = Math.round(score);
  }

  const nextChallengerScore = patch.challenger_score ?? match.challenger_score;
  const nextOpponentScore = patch.opponent_score ?? match.opponent_score;
  if (nextChallengerScore !== null && nextChallengerScore !== undefined && nextOpponentScore !== null && nextOpponentScore !== undefined) {
    patch.status = 'Completed';
    patch.completed_at = new Date();
    patch.winner_username = nextChallengerScore === nextOpponentScore
      ? null
      : nextChallengerScore > nextOpponentScore
        ? match.challenger_username
        : match.opponent_username;
  }

  await match.update(patch);
  return res.json(matchPayload(match));
}));

module.exports = router;
