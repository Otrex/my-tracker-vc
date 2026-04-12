const express = require('express');
const XLSX = require('xlsx');
const { requireAuth } = require('../middleware/auth');
const { ensureWeek, getWeekRows } = require('../services/routineService');
const { plain, route } = require('../utils/http');

const router = express.Router();

router.get('/export', requireAuth, route(async (req, res) => {
  const weekStart = await ensureWeek(req.query.week);
  const rows = (await getWeekRows(weekStart)).map(plain);
  const trackerRows = rows.map((row) => {
    const planned = Number(row.planned_duration || 0);
    const actual = Number(row.actual_duration || 0);
    const completion = planned > 0 ? Math.min(100, (actual / planned) * 100) : 0;
    return {
      Day: row.day,
      'Planned Activity': row.planned_activity,
      'Planned Duration (hrs)': planned,
      'Completed?': row.completed,
      'Actual Duration (hrs)': actual,
      'Miles Travelled': Number(row.miles_travelled || 0),
      'Skips/Reps': Number(row.skips_reps || 0),
      'Difference (hrs)': Number((actual - planned).toFixed(2)),
      'Completion %': Number(completion.toFixed(0)),
      'Workout Notes': row.workout_notes || '',
      Notes: row.notes || ''
    };
  });
  const totalPlanned = rows.reduce((sum, row) => sum + Number(row.planned_duration || 0), 0);
  const totalActual = rows.reduce((sum, row) => sum + Number(row.actual_duration || 0), 0);
  const daysCompleted = rows.filter((row) => row.completed === 'Yes').length;
  const totalMiles = rows.reduce((sum, row) => sum + Number(row.miles_travelled || 0), 0);
  const totalReps = rows.reduce((sum, row) => sum + Number(row.skips_reps || 0), 0);
  const completionRate = rows.length ? (daysCompleted / rows.length) * 100 : 0;
  const summaryRows = [
    ['Metric', 'Value'],
    ['Total planned hours', Number(totalPlanned.toFixed(2))],
    ['Total actual hours', Number(totalActual.toFixed(2))],
    ['Hours variance', Number((totalActual - totalPlanned).toFixed(2))],
    ['Completion rate (%)', Number(completionRate.toFixed(0))],
    ['Days completed count', daysCompleted],
    ['Total miles travelled', Number(totalMiles.toFixed(2))],
    ['Total skips/reps', totalReps]
  ];

  const workbook = XLSX.utils.book_new();
  const trackerSheet = XLSX.utils.json_to_sheet(trackerRows);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  [trackerSheet, summarySheet].forEach((sheet) => {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (sheet[cellRef]) {
        sheet[cellRef].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: 'FF8C2A' } }
        };
      }
    }
    sheet['!cols'] = Array.from({ length: range.e.c - range.s.c + 1 }, () => ({ wch: 24 }));
  });

  XLSX.utils.book_append_sheet(workbook, trackerSheet, 'Weekly Tracker');
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="routine_${weekStart}.xlsx"`);
  return res.send(buffer);
}));

module.exports = router;
