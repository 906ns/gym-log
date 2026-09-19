export const repeatDelay = elapsed => elapsed >= 1500 ? 60 : 120;
export function stepValue(value, delta, min, max) {
  if (value === null && min > 0) return { value: min, continue: delta > 0 && min < max };
  const next = Math.min(max, Math.max(min, Math.round((value + delta) * 10000) / 10000));
  return { value: next, continue: delta > 0 ? next < max : next > min };
}
