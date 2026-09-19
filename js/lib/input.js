import { LB_IN_KG } from './units.js';
export const repeatDelay = elapsed => elapsed >= 1500 ? 60 : 120;
export function stepValue(value, delta, min, max) {
  if (value === null && min > 0) return { value: min, continue: delta > 0 && min < max };
  const next = Math.min(max, Math.max(min, Math.round((value + delta) * 10000) / 10000));
  return { value: next, continue: delta > 0 ? next < max : next > min };
}

export function setInputErrors(weight, reps, unit = 'kg') {
  const errors = {};
  const weightText = String(weight).normalize('NFKC').trim();
  const repsText = String(reps).normalize('NFKC').trim();
  const decimal = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;
  const kg = Number(weightText) * (unit === 'lb' ? LB_IN_KG : 1);
  if (!weightText) errors.weight = '重量を入力してください';
  else if (!decimal.test(weightText)) errors.weight = '重量は数字で入力してください';
  else if (!Number.isFinite(kg) || kg < 0 || kg > 500) errors.weight = '重量は0〜500 kgに相当する範囲で入力してください';
  if (!repsText) errors.reps = 'レップを入力してください';
  else if (!decimal.test(repsText)) errors.reps = 'レップは数字で入力してください';
  else if (!Number.isInteger(Number(repsText)) || Number(repsText) < 1 || Number(repsText) > 100) errors.reps = 'レップは1〜100の整数で入力してください';
  return errors;
}
