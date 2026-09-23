import { epley } from './calc.js';
const usable = row => row.deleted_at === null && !row.is_warmup;
export function personalRecords(sets) {
  const rows = sets.filter(usable);
  let weightSet = null;
  let estimated = 0;
  let volume = 0;
  for (const row of rows) {
    if (!weightSet || row.weight > weightSet.weight || row.weight === weightSet.weight && row.reps > weightSet.reps) weightSet = row;
    estimated = Math.max(estimated, epley(row.weight, row.reps)); volume = Math.max(volume, row.weight * row.reps);
  }
  return { weightSet, estimated, volume };
}
export function recordAchievements(sets) {
  const rows = sets.filter(usable).slice().sort((a, b) => a.created_at - b.created_at || a.recorded_at - b.recorded_at || a.id.localeCompare(b.id));
  const result = new Map();
  let count = 0;
  let weight = 0; let estimated = 0; let volume = 0;
  for (const row of rows) {
    const values = { weight: row.weight, estimated: epley(row.weight, row.reps), volume: row.weight * row.reps };
    const updates = [];
    if (count && values.weight > weight) updates.push('最大重量');
    if (count && values.estimated > estimated) updates.push('推定1RM');
    if (count && values.volume > volume) updates.push('最大ボリューム');
    result.set(row.id, updates);
    weight = Math.max(weight, values.weight); estimated = Math.max(estimated, values.estimated); volume = Math.max(volume, values.volume); count++;
  }
  return result;
}
