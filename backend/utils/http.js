function route(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function plain(model) {
  return model ? model.get({ plain: true }) : null;
}

function normalNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  return Number(value);
}

function validateNonNegative(value, field) {
  if (!Number.isFinite(value) || value < 0) return `${field} must be a positive number`;
  return null;
}

function asJsonArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value.split('\n').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function clamp(value, min, max) {
  const number = normalNumber(value, min);
  return Math.min(max, Math.max(min, number));
}

module.exports = {
  asJsonArray,
  clamp,
  normalNumber,
  plain,
  route,
  validateNonNegative
};
