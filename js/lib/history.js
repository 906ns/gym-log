export function groupHistory(sets, sessions, limit = 10) {
  const groups = new Map();
  for (const session of sessions) if (session.deleted_at === null) groups.set(session.id, { ...session, sets: [] });
  for (const set of sets) if (set.deleted_at === null) groups.get(set.session_id)?.sets.push(set);
  return [...groups.values()].filter(group => group.sets.length).sort((a, b) => b.started_at - a.started_at || b.created_at - a.created_at).slice(0, limit)
    .map(group => ({ ...group, sets: group.sets.sort((a, b) => a.recorded_at - b.recorded_at || a.order - b.order) }));
}
export function filterExercises(rows, part, query) {
  const search = query.trim().toLocaleLowerCase('ja-JP');
  return rows.filter(row => !row.is_archived && (!part || row.body_part === part) && `${row.name} ${row.name_en}`.toLocaleLowerCase('ja-JP').includes(search));
}
