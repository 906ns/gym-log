import { dateKey, validDate } from './datetime.js';
export function monthGrid(key) {
  const date = new Date(`${key.slice(0, 7)}-01T12:00:00`);
  const year = date.getFullYear(); const month = date.getMonth();
  const length = new Date(year, month + 1, 0).getDate();
  const cells = Array((date.getDay() + 6) % 7).fill(null);
  for (let day = 1; day <= length; day++) cells.push(dateKey(new Date(year, month, day, 12)));
  while (cells.length % 7) cells.push(null);
  return { label: `${year}年${month + 1}月`, cells, first: dateKey(date), last: dateKey(new Date(year, month, length, 12)) };
}
export function shiftMonth(key, delta) {
  const date = new Date(`${key.slice(0, 7)}-01T12:00:00`);
  return dateKey(new Date(date.getFullYear(), date.getMonth() + delta, 1, 12));
}
export const isPastEntry = session => session.date < dateKey(new Date(session.created_at));
export function pastStart(key, today) {
  if (!validDate(key) || key >= today) throw new Error('今日より前の日付を選んでください');
  return new Date(`${key}T12:00:00`).getTime();
}
