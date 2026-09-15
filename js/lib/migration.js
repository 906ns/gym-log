export function migrateExercise(row) {
  const { weight_increment, ...rest } = row;
  return { ...rest, increment_kg: row.increment_kg ?? weight_increment ?? 5, increment_lb: row.increment_lb ?? 5, display_unit: row.display_unit ?? 'inherit' };
}
export function migrateData(data) {
  const meta = (data.meta || []).map(row => row.key === 'schema_version' ? { ...row, value: 2 } : { ...row });
  if (!meta.some(row => row.key === 'weight_unit')) meta.push({ key: 'weight_unit', value: 'kg' });
  if (!meta.some(row => row.key === 'schema_version')) meta.push({ key: 'schema_version', value: 2 });
  return { ...data, exercises: data.exercises.map(migrateExercise), meta };
}
