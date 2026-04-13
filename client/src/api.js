const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function handleUnauthorized() {
  localStorage.removeItem('token');
  window.dispatchEvent(new Event('auth-expired'));
}

function authHeaders(json = true, updateToken = '') {
  const headers = {
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
  };

  if (json) {
    headers['Content-Type'] = 'application/json';
  }

  if (updateToken) {
    headers['X-Update-Token'] = updateToken;
  }

  return headers;
}

async function readJson(response, authAware = true) {
  if (authAware && response.status === 401) {
    handleUnauthorized();
    throw new Error('Your session expired. Please log in again.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Something went wrong');
  }

  return response.json();
}

export async function login(creds) {
  const response = await fetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds)
  });

  return readJson(response, false);
}

export async function registerUser(creds) {
  const response = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds)
  });

  return readJson(response, false);
}

export async function getRoutine(week) {
  const response = await fetch(`${BASE}/api/routine?week=${encodeURIComponent(week)}`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function updateRoutine(id, data, updateToken = '') {
  const response = await fetch(`${BASE}/api/routine/${id}`, {
    method: 'PATCH',
    headers: authHeaders(true, updateToken),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function getWeeks() {
  const response = await fetch(`${BASE}/api/weeks`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function getProfile() {
  const response = await fetch(`${BASE}/api/profile`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function updateProfile(data) {
  const response = await fetch(`${BASE}/api/profile`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function getDiet(date) {
  const response = await fetch(`${BASE}/api/diet?date=${encodeURIComponent(date)}`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function getDietWeek(week) {
  const response = await fetch(`${BASE}/api/diet/weekly?week=${encodeURIComponent(week)}`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function getDietGoals() {
  const response = await fetch(`${BASE}/api/diet/goals`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function updateDietGoals(data) {
  const response = await fetch(`${BASE}/api/diet/goals`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function createDietEntry(data) {
  const response = await fetch(`${BASE}/api/diet`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function updateDietEntry(id, data) {
  const response = await fetch(`${BASE}/api/diet/${id}`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function deleteDietEntry(id) {
  const response = await fetch(`${BASE}/api/diet/${id}`, {
    method: 'DELETE',
    headers: authHeaders(false)
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Your session expired. Please log in again.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Could not delete diet entry');
  }

  return true;
}

export async function forgotPassword(data) {
  const response = await fetch(`${BASE}/api/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return readJson(response, false);
}

export async function resetPassword(data) {
  const response = await fetch(`${BASE}/api/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  return readJson(response, false);
}

export async function getLearning() {
  const response = await fetch(`${BASE}/api/learning`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function createLearningSubject(data) {
  const response = await fetch(`${BASE}/api/learning`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function updateLearningSubject(subjectId, data) {
  const response = await fetch(`${BASE}/api/learning/${subjectId}`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function addLearningSession(subjectId, data) {
  const response = await fetch(`${BASE}/api/learning/${subjectId}/sessions`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function submitLearningExam(subjectId, data) {
  const response = await fetch(`${BASE}/api/learning/${subjectId}/exam`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function getLearningSettings() {
  const response = await fetch(`${BASE}/api/settings/learning`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function updateLearningSettings(data, updateToken) {
  const response = await fetch(`${BASE}/api/settings/learning`, {
    method: 'PATCH',
    headers: authHeaders(true, updateToken),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function getLeaderboard() {
  const response = await fetch(`${BASE}/api/leaderboard`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function getChallenges() {
  const response = await fetch(`${BASE}/api/challenges`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function createChallenge(data) {
  const response = await fetch(`${BASE}/api/challenges`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function updateChallenge(id, data) {
  const response = await fetch(`${BASE}/api/challenges/${id}`, {
    method: 'PATCH',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function getGameMatches() {
  const response = await fetch(`${BASE}/api/game/matches`, {
    headers: authHeaders(false)
  });

  return readJson(response);
}

export async function createGameMatch(data) {
  const response = await fetch(`${BASE}/api/game/matches`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(data)
  });

  return readJson(response);
}

export async function acceptGameMatch(id) {
  const response = await fetch(`${BASE}/api/game/matches/${id}/accept`, {
    method: 'PATCH',
    headers: authHeaders(true)
  });

  return readJson(response);
}

export async function submitGameScore(id, score) {
  const response = await fetch(`${BASE}/api/game/matches/${id}/score`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ score })
  });

  return readJson(response);
}

export async function exportWeek(week) {
  const response = await fetch(`${BASE}/api/export?week=${encodeURIComponent(week)}`, {
    headers: authHeaders(false)
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Your session expired. Please log in again.');
  }

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition') || '';
  const match = contentDisposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `routine_${week}.xlsx`;
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);

  return filename;
}
