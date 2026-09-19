import { chart } from './graphics.js';
import { maxWeight } from '../lib/calc.js';
import * as repo from '../repo.js';
import { groupHistory } from '../lib/history.js';
import { personalRecords } from '../lib/records.js';
import { weightText, formatTotal } from '../lib/units.js';
import { formatDate } from '../lib/datetime.js';
import { element, button, dialog, editText } from './ui.js';
export async function showExerciseHistory(exercise, unit, onChange) {
  const { sets, sessions } = await repo.exerciseHistory(exercise.id);
  const history = groupHistory(sets, sessions);
  const pr = personalRecords(sets);
  const modal = dialog('dlg-history', exercise.name);
  modal.append(element('h2', '自己ベスト'));
  if (pr.weightSet) modal.append(element('p', `最大重量 ${weightText(pr.weightSet.weight, unit)} × ${pr.weightSet.reps}`),
    element('p', `推定1RM ${formatTotal(pr.estimated, unit)}`), element('p', `最大ボリューム ${formatTotal(pr.volume, unit)}`));
  else modal.append(element('p', '最初のセットを記録しましょう', 'muted'));
  if (history.length) modal.append(chart([...history].reverse().map(group => maxWeight(group.sets)), '直近10セッションの最大重量の推移'));
  modal.append(element('h2', '履歴'));
  for (const group of history) {
    const row = element('section', undefined, 'history-entry');
    row.append(element('h3', `${formatDate(group.date)} / ${group.sets.length}セット`));
    for (const set of group.sets) row.append(element('p', `${weightText(set.weight, unit)} × ${set.reps}${set.note ? ` 「${set.note}」` : ''}`, 'memo'));
    modal.append(row);
  }
  modal.append(element('h2', 'セッティング'), button(exercise.setup_note || 'セッティングをメモする', () => editText('セッティング', exercise.setup_note, async value => {
    exercise = await repo.saveExercise({ ...exercise, setup_note: value }, exercise);
    await onChange(); modal.close(); await showExerciseHistory(exercise, unit, onChange);
  }), 'note'));
  modal.append(button('閉じる', () => modal.close(), 'wide'));
  modal.showModal();
}
