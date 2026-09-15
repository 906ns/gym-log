export const round = (value, digits = 2) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
export function numberInput(value, min, max, integer = false) {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value).trim())) throw new Error('数値を入力してください');
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) throw new Error(`${min}〜${max}${integer ? 'の整数' : ''}を入力してください`);
  return number;
}
export function setValues(weight, reps) {
  const value = round(numberInput(weight, 0, 500), 4);
  return { weight: value, reps: numberInput(reps, 1, 100, true) };
}
const valid = (weight, reps) => Number.isFinite(weight) && weight >= 0 && weight <= 500 && Number.isInteger(reps) && reps >= 1 && reps <= 100;
export const estimatedMax = (weight, reps) => valid(weight, reps) ? round(reps === 1 ? weight : weight * (1 + reps / 30), 1) : 0;
export const setVolume = ({ weight, reps }) => valid(weight, reps) ? round(weight * reps, 4) : 0;
export const activeSets = sets => sets.filter(set => set.deleted_at === null);
export const sessionVolume = sets => round(activeSets(sets).reduce((sum, set) => sum + (valid(set.weight, set.reps) ? set.weight * set.reps : 0), 0), 4);
export const maxWeight = sets => Math.max(0, ...activeSets(sets).map(set => set.weight));
export const bestMax = sets => Math.max(0, ...activeSets(sets).map(set => estimatedMax(set.weight, set.reps)));
export const previousDifference = (today, previous) => round(bestMax(today) - bestMax(previous), 1);
export const signedDifference = (value, previous) => { const delta = round(value - previous, 1); return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`; };
export const increment = (value, step, min, max) => round(Math.min(max, Math.max(min, (Number(value) || 0) + step)));
