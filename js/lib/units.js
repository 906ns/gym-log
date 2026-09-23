export const LB_IN_KG = 0.45359237;
const round = (value, digits) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
export const lbToKg = lb => round(lb * LB_IN_KG, 4);
export const kgToLb = kg => kg / LB_IN_KG;
export function roundForDisplay(value, unit) {
  return round(Math.round(value / (unit === 'lb' ? .5 : .25)) * (unit === 'lb' ? .5 : .25), 2);
}
export function formatWeight(kg, unit = 'kg') {
  return { value: roundForDisplay(unit === 'lb' ? kgToLb(kg) : kg, unit), label: unit };
}
export function parseWeightInput(text, unit = 'kg') {
  const normalized = String(text).normalize('NFKC').trim();
  if (!['kg', 'lb'].includes(unit) || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const input = Number(normalized);
  const exact = unit === 'lb' ? input * LB_IN_KG : input;
  if (!Number.isFinite(exact) || exact < 0 || exact > 500) return null;
  return round(exact, 4);
}
export const resolveUnit = (exercise, globalUnit) => exercise?.display_unit && exercise.display_unit !== 'inherit' ? exercise.display_unit : globalUnit;
// 集計値は重量の入力刻みには合わせず、kgで集計した結果だけを換算する。
export const formatTotal = (kg, unit) => `${round(unit === 'lb' ? kgToLb(kg) : kg, 1).toLocaleString('ja-JP')} ${unit}`;
export function weightText(kg, unit) {
  const result = formatWeight(kg, unit);
  return `${result.value.toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${result.label}`;
}
export const inputWeight = (kg, unit) => formatWeight(kg, unit).value;
