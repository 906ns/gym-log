import { dateKey, elapsedSeconds } from './datetime.js';
import { isPastEntry } from './calendar.js';
import { sessionVolume } from './calc.js';
import { recordAchievements } from './records.js';
export function weekStart(today) {
  const date = new Date(`${today}T12:00:00`);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return dateKey(date);
}
export const daysBetween = (earlier, later) => Math.round((Date.parse(`${later}T00:00:00Z`) - Date.parse(`${earlier}T00:00:00Z`)) / 86400000);
export function summary(session, sets, histories) {
  const active = sets.filter(row => row.deleted_at === null);
  let records = 0;
  for (const history of histories) {
    const achievements = recordAchievements(history);
    records += active.filter(row => achievements.get(row.id)?.length).length;
  }
  return { duration: isPastEntry(session) ? null : elapsedSeconds(session.started_at, session.ended_at), exercises: new Set(active.map(row => row.exercise_id)).size, sets: active.length, volume: sessionVolume(active), records };
}
export function sparkline(values, width = 280, height = 56) {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return { path: '', points: [] };
  const min = Math.min(...finite); const max = Math.max(...finite); const padding = 4;
  const points = finite.map((value, index) => ({ x: finite.length === 1 ? width / 2 : padding + index * (width - padding * 2) / (finite.length - 1), y: max === min ? height / 2 : height - padding - (value - min) / (max - min) * (height - padding * 2) }));
  return { path: points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' '), points };
}
