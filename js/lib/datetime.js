export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function elapsedSeconds(start, now) {
  return Math.max(0, Math.floor((now - start) / 1000));
}
export function formatElapsed(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function formatDate(key) {
  return new Date(`${key}T12:00:00`).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
}
export function validDate(key) {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && dateKey(new Date(`${key}T12:00:00`)) === key;
}
