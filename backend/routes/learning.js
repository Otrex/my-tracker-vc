const express = require('express');
const { ExamAttempt, LearningSession, LearningSubject, Setting } = require('../models');
const { hasBackOfficeToken, requireAuth } = require('../middleware/auth');
const { dateToIso, parseIsoDate } = require('../utils/date');
const { asJsonArray, normalNumber, plain, route, validateNonNegative } = require('../utils/http');

const router = express.Router();

router.get('/settings/learning', requireAuth, route(async (req, res) => {
  const setting = await Setting.findByPk('learning_default_duration');
  return res.json({ default_duration: Number(setting?.value || 1) });
}));

router.patch('/settings/learning', requireAuth, route(async (req, res) => {
  if (!hasBackOfficeToken(req)) return res.status(403).json({ error: 'Back-office update token required' });
  const defaultDuration = normalNumber(req.body?.default_duration, 1);
  const error = validateNonNegative(defaultDuration, 'default_duration');
  if (error) return res.status(400).json({ error });

  await Setting.upsert({ key: 'learning_default_duration', value: String(defaultDuration || 1) });
  return res.json({ default_duration: defaultDuration || 1 });
}));

router.get('/learning', requireAuth, route(async (req, res) => {
  const subjects = await LearningSubject.findAll({
    where: { user_username: req.user.user },
    order: [['created_at', 'DESC']]
  });
  const sessions = await LearningSession.findAll({ where: { user_username: req.user.user } });
  const attempts = await ExamAttempt.findAll({ where: { user_username: req.user.user } });
  const sessionMap = sessions.reduce((acc, item) => {
    const key = item.subject_id;
    acc[key] = acc[key] || { actual_duration: 0, completed: 0 };
    acc[key].actual_duration += Number(item.actual_duration || 0);
    acc[key].completed += item.completed ? 1 : 0;
    return acc;
  }, {});
  const attemptMap = attempts.reduce((acc, item) => {
    acc[item.subject_id] = Math.max(acc[item.subject_id] || 0, Number(item.score || 0));
    return acc;
  }, {});

  return res.json(subjects.map((subject) => ({
    ...plain(subject),
    goal_questions: JSON.parse(subject.goal_questions || '[]'),
    progress: sessionMap[subject.id] || { actual_duration: 0, completed: 0 },
    best_exam_score: attemptMap[subject.id] || 0
  })));
}));

router.post('/learning', requireAuth, route(async (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Subject title is required' });

  const setting = await Setting.findByPk('learning_default_duration');
  const defaultDuration = Number(setting?.value || 1);
  const subject = await LearningSubject.create({
    user_username: req.user.user,
    title,
    learning_plan: String(req.body?.learning_plan || ''),
    total_duration: normalNumber(req.body?.total_duration),
    duration_per_day: req.body?.duration_per_day === '' || req.body?.duration_per_day === undefined
      ? defaultDuration
      : normalNumber(req.body.duration_per_day, defaultDuration),
    goal_questions: JSON.stringify(asJsonArray(req.body?.goal_questions)),
    status: 'Active'
  });

  return res.status(201).json({ ...plain(subject), goal_questions: JSON.parse(subject.goal_questions || '[]') });
}));

router.patch('/learning/:id', requireAuth, route(async (req, res) => {
  const subject = await LearningSubject.findOne({ where: { id: Number(req.params.id), user_username: req.user.user } });
  if (!subject) return res.status(404).json({ error: 'Learning subject not found' });

  await subject.update({
    title: req.body.title !== undefined ? String(req.body.title).trim() : subject.title,
    learning_plan: req.body.learning_plan !== undefined ? String(req.body.learning_plan) : subject.learning_plan,
    total_duration: req.body.total_duration !== undefined ? normalNumber(req.body.total_duration) : subject.total_duration,
    duration_per_day: req.body.duration_per_day !== undefined ? normalNumber(req.body.duration_per_day) : subject.duration_per_day,
    goal_questions: req.body.goal_questions !== undefined ? JSON.stringify(asJsonArray(req.body.goal_questions)) : subject.goal_questions,
    status: req.body.status !== undefined ? String(req.body.status) : subject.status
  });

  return res.json({ ...plain(subject), goal_questions: JSON.parse(subject.goal_questions || '[]') });
}));

router.post('/learning/:id/sessions', requireAuth, route(async (req, res) => {
  const subject = await LearningSubject.findOne({ where: { id: Number(req.params.id), user_username: req.user.user } });
  if (!subject) return res.status(404).json({ error: 'Learning subject not found' });

  const plannedDuration = req.body?.planned_duration === undefined ? Number(subject.duration_per_day || 1) : normalNumber(req.body.planned_duration);
  const session = await LearningSession.create({
    user_username: req.user.user,
    subject_id: subject.id,
    session_date: dateToIso(parseIsoDate(req.body?.session_date)),
    planned_duration: plannedDuration,
    actual_duration: normalNumber(req.body?.actual_duration),
    completed: Boolean(req.body?.completed),
    notes: String(req.body?.notes || '')
  });

  return res.status(201).json(plain(session));
}));

router.post('/learning/:id/exam', requireAuth, route(async (req, res) => {
  const subject = await LearningSubject.findOne({ where: { id: Number(req.params.id), user_username: req.user.user } });
  if (!subject) return res.status(404).json({ error: 'Learning subject not found' });

  const goals = JSON.parse(subject.goal_questions || '[]');
  const answers = asJsonArray(req.body?.answers);
  const graded = goals.map((goal, index) => {
    const answer = String(answers[index] || '').trim();
    const points = answer.length >= 25 ? 1 : answer.length >= 12 ? 0.5 : 0;
    return { goal, answer, points };
  });
  const score = goals.length ? Math.round((graded.reduce((sum, item) => sum + item.points, 0) / goals.length) * 100) : 0;
  const passed = score >= 70;
  const feedback = passed
    ? 'Passed. Your answers are detailed enough to move forward.'
    : 'Review recommended. Relearn the weak areas and retake the exam.';

  const attempt = await ExamAttempt.create({
    user_username: req.user.user,
    subject_id: subject.id,
    answers: JSON.stringify(graded),
    score,
    passed,
    feedback
  });

  return res.status(201).json({ ...plain(attempt), answers: graded });
}));

module.exports = router;
