const express = require('express');
const { ExamAttempt, LearningSession, LearningSubject, Setting } = require('../models');
const { hasBackOfficeToken, requireAuth } = require('../middleware/auth');
const { dateToIso, parseIsoDate } = require('../utils/date');
const { normalNumber, plain, route, validateNonNegative } = require('../utils/http');

const router = express.Router();

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return value.split('\n').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function normalizeStringList(value) {
  return parseArray(value).map((item) => String(item).trim()).filter(Boolean);
}

function normalizeQuestions(value) {
  return parseArray(value).map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: `q-${Date.now()}-${index}`,
        type: 'written',
        prompt: item,
        options: [],
        correct_answer: '',
        model_answer: '',
        rubric_keywords: [],
        points: 1
      };
    }

    const type = ['mcq', 'written', 'drawing'].includes(item.type) ? item.type : 'written';
    const options = Array.isArray(item.options)
      ? item.options.map((option) => String(option).trim()).filter(Boolean)
      : String(item.options || '').split('\n').map((option) => option.trim()).filter(Boolean);

    return {
      id: item.id || `q-${Date.now()}-${index}`,
      type,
      prompt: String(item.prompt || '').trim(),
      options,
      correct_answer: String(item.correct_answer || '').trim(),
      model_answer: String(item.model_answer || '').trim(),
      rubric_keywords: normalizeStringList(item.rubric_keywords),
      points: Math.max(1, normalNumber(item.points, 1))
    };
  }).filter((item) => item.prompt);
}

function publicAttempt(attempt) {
  const row = plain(attempt);
  if (!row) return null;
  return {
    ...row,
    answers: parseArray(row.answers),
    strengths: normalizeStringList(row.strengths),
    review_topics: normalizeStringList(row.review_topics)
  };
}

function publicSubject(subject, progress, bestExamScore, latestAttempt) {
  const row = plain(subject);
  const examQuestions = normalizeQuestions(row.exam_questions);
  const legacyQuestions = normalizeStringList(row.goal_questions);

  return {
    ...row,
    course: row.course || 'General',
    success_metrics: normalizeStringList(row.success_metrics),
    resources: normalizeStringList(row.resources),
    milestones: normalizeStringList(row.milestones),
    goal_questions: legacyQuestions.length ? legacyQuestions : examQuestions.map((question) => question.prompt),
    exam_questions: examQuestions,
    progress,
    best_exam_score: bestExamScore,
    latest_exam_attempt: latestAttempt ? publicAttempt(latestAttempt) : null
  };
}

function keywordPool(question) {
  const explicit = normalizeStringList(question.rubric_keywords);
  if (explicit.length) return explicit;

  return String(question.model_answer || question.correct_answer || '')
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 4)
    .slice(0, 8);
}

function gradeQuestion(question, answerValue) {
  const answer = typeof answerValue === 'object' && answerValue !== null
    ? [answerValue.selected, answerValue.labels, answerValue.explanation, answerValue.text].filter(Boolean).join(' ').trim()
    : String(answerValue ?? '').trim();
  const maxPoints = Math.max(1, normalNumber(question.points, 1));

  if (question.type === 'mcq') {
    const correct = String(question.correct_answer || '').trim();
    const passed = correct && answer.toLowerCase() === correct.toLowerCase();
    return {
      ...question,
      answer,
      earned_points: passed ? maxPoints : 0,
      max_points: maxPoints,
      result: passed ? 'Correct' : 'Review',
      feedback: passed ? 'Correct option selected.' : `Expected: ${correct || 'No answer key set.'}`
    };
  }

  const keywords = keywordPool(question);
  const answerLower = answer.toLowerCase();
  const matched = keywords.filter((keyword) => answerLower.includes(String(keyword).toLowerCase()));
  const keywordScore = keywords.length ? matched.length / keywords.length : 0;
  const lengthScore = answer.length >= 160 ? 1 : answer.length >= 80 ? 0.75 : answer.length >= 35 ? 0.45 : answer.length > 0 ? 0.2 : 0;
  const ratio = keywords.length ? Math.max(keywordScore, lengthScore * 0.65) : lengthScore;
  const earned = Number((maxPoints * Math.min(1, ratio)).toFixed(2));

  return {
    ...question,
    answer,
    earned_points: earned,
    max_points: maxPoints,
    matched_keywords: matched,
    result: earned / maxPoints >= 0.7 ? 'Strong' : earned / maxPoints >= 0.4 ? 'Partial' : 'Review',
    feedback: question.type === 'drawing'
      ? `Label coverage: ${matched.length}/${keywords.length || 'n/a'} expected labels.`
      : `Concept coverage: ${matched.length}/${keywords.length || 'n/a'} key ideas.`
  };
}

function nextReviewDate(score) {
  const date = new Date();
  date.setDate(date.getDate() + (score >= 85 ? 14 : score >= 70 ? 7 : 2));
  return dateToIso(date);
}

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
    order: [['course', 'ASC'], ['created_at', 'DESC']]
  });
  const sessions = await LearningSession.findAll({ where: { user_username: req.user.user } });
  const attempts = await ExamAttempt.findAll({
    where: { user_username: req.user.user },
    order: [['created_at', 'DESC']]
  });
  const sessionMap = sessions.reduce((acc, item) => {
    const key = item.subject_id;
    acc[key] = acc[key] || { actual_duration: 0, completed: 0, sessions: 0 };
    acc[key].actual_duration += Number(item.actual_duration || 0);
    acc[key].completed += item.completed ? 1 : 0;
    acc[key].sessions += 1;
    return acc;
  }, {});
  const attemptMap = attempts.reduce((acc, item) => {
    acc[item.subject_id] = Math.max(acc[item.subject_id] || 0, Number(item.score || 0));
    return acc;
  }, {});
  const latestAttemptMap = attempts.reduce((acc, item) => {
    if (!acc[item.subject_id]) acc[item.subject_id] = item;
    return acc;
  }, {});

  return res.json(subjects.map((subject) => publicSubject(
    subject,
    sessionMap[subject.id] || { actual_duration: 0, completed: 0, sessions: 0 },
    attemptMap[subject.id] || 0,
    latestAttemptMap[subject.id]
  )));
}));

router.post('/learning', requireAuth, route(async (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Subject title is required' });

  const setting = await Setting.findByPk('learning_default_duration');
  const defaultDuration = Number(setting?.value || 1);
  const examQuestions = normalizeQuestions(req.body?.exam_questions || req.body?.goal_questions);
  const goalQuestions = examQuestions.map((question) => question.prompt);
  const subject = await LearningSubject.create({
    user_username: req.user.user,
    course: String(req.body?.course || 'General').trim() || 'General',
    title,
    end_goal: String(req.body?.end_goal || ''),
    success_metrics: JSON.stringify(normalizeStringList(req.body?.success_metrics)),
    learning_plan: String(req.body?.learning_plan || ''),
    resources: JSON.stringify(normalizeStringList(req.body?.resources)),
    milestones: JSON.stringify(normalizeStringList(req.body?.milestones)),
    total_duration: normalNumber(req.body?.total_duration),
    duration_per_day: req.body?.duration_per_day === '' || req.body?.duration_per_day === undefined
      ? defaultDuration
      : normalNumber(req.body.duration_per_day, defaultDuration),
    goal_questions: JSON.stringify(goalQuestions),
    exam_questions: JSON.stringify(examQuestions),
    exam_duration_minutes: Math.max(1, Math.round(normalNumber(req.body?.exam_duration_minutes, 30))),
    pass_score: Math.min(100, Math.max(1, normalNumber(req.body?.pass_score, 70))),
    difficulty: String(req.body?.difficulty || 'Intermediate'),
    status: 'Active'
  });

  return res.status(201).json(publicSubject(subject, { actual_duration: 0, completed: 0, sessions: 0 }, 0, null));
}));

router.patch('/learning/:id', requireAuth, route(async (req, res) => {
  const subject = await LearningSubject.findOne({ where: { id: Number(req.params.id), user_username: req.user.user } });
  if (!subject) return res.status(404).json({ error: 'Learning subject not found' });

  const patch = {
    course: req.body.course !== undefined ? String(req.body.course || 'General').trim() || 'General' : subject.course,
    title: req.body.title !== undefined ? String(req.body.title).trim() : subject.title,
    end_goal: req.body.end_goal !== undefined ? String(req.body.end_goal) : subject.end_goal,
    success_metrics: req.body.success_metrics !== undefined ? JSON.stringify(normalizeStringList(req.body.success_metrics)) : subject.success_metrics,
    learning_plan: req.body.learning_plan !== undefined ? String(req.body.learning_plan) : subject.learning_plan,
    resources: req.body.resources !== undefined ? JSON.stringify(normalizeStringList(req.body.resources)) : subject.resources,
    milestones: req.body.milestones !== undefined ? JSON.stringify(normalizeStringList(req.body.milestones)) : subject.milestones,
    total_duration: req.body.total_duration !== undefined ? normalNumber(req.body.total_duration) : subject.total_duration,
    duration_per_day: req.body.duration_per_day !== undefined ? normalNumber(req.body.duration_per_day) : subject.duration_per_day,
    exam_duration_minutes: req.body.exam_duration_minutes !== undefined ? Math.max(1, Math.round(normalNumber(req.body.exam_duration_minutes))) : subject.exam_duration_minutes,
    pass_score: req.body.pass_score !== undefined ? Math.min(100, Math.max(1, normalNumber(req.body.pass_score))) : subject.pass_score,
    difficulty: req.body.difficulty !== undefined ? String(req.body.difficulty) : subject.difficulty,
    status: req.body.status !== undefined ? String(req.body.status) : subject.status
  };

  if (req.body.exam_questions !== undefined || req.body.goal_questions !== undefined) {
    const examQuestions = normalizeQuestions(req.body.exam_questions || req.body.goal_questions);
    patch.exam_questions = JSON.stringify(examQuestions);
    patch.goal_questions = JSON.stringify(examQuestions.map((question) => question.prompt));
  }

  await subject.update(patch);
  return res.json(publicSubject(subject, { actual_duration: 0, completed: 0, sessions: 0 }, 0, null));
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

  const questions = normalizeQuestions(subject.exam_questions || subject.goal_questions);
  if (!questions.length) return res.status(400).json({ error: 'This subject has no exam questions yet' });

  const answers = Array.isArray(req.body?.answers) ? req.body.answers : parseArray(req.body?.answers);
  const graded = questions.map((question, index) => gradeQuestion(question, answers[index] || ''));
  const earned = graded.reduce((sum, item) => sum + Number(item.earned_points || 0), 0);
  const possible = graded.reduce((sum, item) => sum + Number(item.max_points || 1), 0);
  const score = possible ? Math.round((earned / possible) * 100) : 0;
  const timeTaken = Math.max(0, Math.round(normalNumber(req.body?.time_taken_seconds, 0)));
  const timedOut = Boolean(req.body?.timed_out) || timeTaken > Number(subject.exam_duration_minutes || 30) * 60;
  const passed = score >= Number(subject.pass_score || 70) && !timedOut;
  const reviewTopics = graded
    .filter((item) => item.earned_points / item.max_points < 0.7)
    .map((item) => item.prompt);
  const strengths = graded
    .filter((item) => item.earned_points / item.max_points >= 0.85)
    .map((item) => item.prompt);
  const feedback = passed
    ? 'Passed. Your answers meet the success standard for this study plan.'
    : timedOut
      ? 'Review recommended. You ran out of time, so repeat the timed exam after revising weak areas.'
      : 'Review recommended. Relearn the weak areas, then retake the exam.';

  const attempt = await ExamAttempt.create({
    user_username: req.user.user,
    subject_id: subject.id,
    answers: JSON.stringify(graded),
    score,
    passed,
    feedback,
    strengths: JSON.stringify(strengths),
    review_topics: JSON.stringify(reviewTopics),
    time_taken_seconds: timeTaken,
    timed_out: timedOut
  });

  await subject.update({
    status: passed ? 'Mastered' : 'Review',
    next_review_date: nextReviewDate(score)
  });

  return res.status(201).json(publicAttempt(attempt));
}));

module.exports = router;
