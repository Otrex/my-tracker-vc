const express = require('express');
const { Challenge, LearningSession, Op, User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { plain, route } = require('../utils/http');

const router = express.Router();

router.get('/leaderboard', requireAuth, route(async (req, res) => {
  const users = await User.findAll({ attributes: ['username', 'display_name'] });
  const learningSessions = await LearningSession.findAll();
  const challenges = await Challenge.findAll({ where: { status: 'Completed' } });

  const rows = users.map((user) => {
    const username = user.username;
    const sessions = learningSessions.filter((item) => item.user_username === username);
    const minutes = sessions.reduce((sum, item) => sum + Number(item.actual_duration || 0) * 60, 0);
    const completedSessions = sessions.filter((item) => item.completed).length;
    const challengeWins = challenges.filter((item) => item.winner_username === username).length;
    const score = Math.round(minutes + completedSessions * 25 + challengeWins * 100);
    return {
      username,
      display_name: user.display_name || username,
      learning_minutes: Math.round(minutes),
      completed_sessions: completedSessions,
      challenge_wins: challengeWins,
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

module.exports = router;
