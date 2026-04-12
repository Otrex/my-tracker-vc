function dateToIso(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value, amount) {
  const date = value instanceof Date ? new Date(value) : parseIsoDate(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function mondayOfWeek(value) {
  const date = value instanceof Date ? new Date(value) : parseIsoDate(value);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return dateToIso(date);
}

module.exports = {
  addDays,
  dateToIso,
  mondayOfWeek,
  parseIsoDate
};
