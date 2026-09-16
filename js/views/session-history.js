import * as repo from '../repo.js';
import { formatDate } from '../lib/datetime.js';
import { weightText, resolveUnit } from '../lib/units.js';
import { element, button, dialog, confirmAction } from './ui.js';
export async function showSessionHistory(session, onDelete) {
    const unit = await repo.setting('weight_unit', 'kg');
    const exercises = await repo.exercises();
    const modal = dialog('dlg-editor', formatDate(session.date));
    if (session.condition_note) modal.append(element('p', session.condition_note, 'memo'));
    for (const id of new Set(session.sets.map(row => row.exercise_id))) {
      modal.append(element('h2', exercises.find(row => row.id === id)?.name || '種目'));
      for (const set of session.sets.filter(row => row.exercise_id === id)) modal.append(element('p', `${weightText(set.weight, resolveUnit(exercises.find(row => row.id === id), unit))} × ${set.reps}${set.note ? ` 「${set.note}」` : ''}`, 'memo'));
    }
    modal.append(button('閉じる', () => modal.close()), button('セッションを削除する', async () => {
      if (await confirmAction('このセッションとセットを削除しますか？')) {
        await repo.deleteSession(session); modal.close(); await onDelete();
      }
    }, 'danger'));
    modal.showModal();
  }
