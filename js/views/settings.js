import * as repo from '../repo.js';
import { dateKey } from '../lib/datetime.js';
import { numberInput } from '../lib/calc.js';
import { element, button, input, label, select, parts, dialog, confirmAction, showError } from './ui.js';
export async function renderSettings(root, navigate) {
  const [exercises, rest, showFat, counts] = await Promise.all([repo.exercises(), repo.setting('default_rest_seconds', 90), repo.setting('show_body_fat', true), repo.counts()]);
  const unit = await repo.setting('weight_unit', 'kg');
  const unitControls = element('div', undefined, 'increments');
  for (const value of ['kg', 'lb']) {
    const control = button(value, async () => { await repo.saveSetting('weight_unit', value); await navigate('settings'); });
    control.setAttribute('aria-pressed', String(unit === value)); unitControls.append(control);
  }
  const refresh = () => navigate('settings');
  const list = element('div');
  exercises.forEach((exercise, index) => {
    const row = element('div', undefined, 'settings-row');
    row.append(button(`${exercise.name} / ${parts[exercise.body_part]}${exercise.is_archived ? '（アーカイブ）' : ''}`, () => editExercise(exercise), 'setting-name'));
    for (const [delta, text] of [[-1, '↑'], [1, '↓']]) {
      const move = button(text, async () => {
        const changed = [...exercises]; [changed[index], changed[index + delta]] = [changed[index + delta], changed[index]];
        await repo.reorderExercises(changed); await refresh();
      });
      move.disabled = index + delta < 0 || index + delta >= exercises.length;
      move.setAttribute('aria-label', `${exercise.name}を${delta < 0 ? '上' : '下'}へ移動`); row.append(move);
    }
    list.append(row);
  });
  const fat = input('体脂肪率を入力する'); fat.type = 'checkbox'; fat.checked = showFat;
  fat.addEventListener('change', () => repo.saveSetting('show_body_fat', fat.checked).catch(showError));
  const upload = input('バックアップファイル'); upload.type = 'file'; upload.accept = '.json,application/json';
  upload.addEventListener('change', async () => {
    const file = upload.files[0]; if (!file) return;
    try {
      const text = await file.text(); repo.validateBackup(text);
      if (await confirmAction('現在の記録がすべて置き換わります。復元しますか？')) {
        await repo.importBackup(text); await navigate('home');
      }
    } catch (error) { showError(error); }
    finally { upload.value = ''; }
  });
  let persisted = false;
  try { persisted = await navigator.storage?.persisted?.() || false; }
  catch (error) { console.error(error); }
  root.replaceChildren(button('ホーム', () => navigate('home')), element('h1', '設定'), element('h2', '種目'), list,
    button('＋ 種目を追加', () => editExercise(), 'wide'), element('h2', 'トレーニング'), element('p', '重量の表示単位'), unitControls,
    button(`目標休憩秒数 ${rest}秒`, () => {
      const modal = dialog('dlg-editor', '目標休憩秒数'); const field = input('秒数', rest, 'numeric');
      modal.append(field, button('保存する', async () => { await repo.saveSetting('default_rest_seconds', numberInput(field.value, 0, 600, true)); modal.close(); await refresh(); }, 'primary'), button('やめる', () => modal.close()));
      modal.showModal();
    }, 'wide'), label('体脂肪率を入力する', fat), element('h2', 'データ'),
    button('バックアップを書き出す', async () => {
      const text = await repo.exportBackup(); const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = element('a'); link.href = url; link.download = `gym-log-${dateKey(new Date())}.json`; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }, 'wide'), label('バックアップから復元する', upload), element('p', `データの保持: ${persisted ? '許可' : '未許可'}`),
    element('p', `セッション ${counts[0]} / セット ${counts[1]} / 体重 ${counts[2]}`), element('h2', 'このアプリ'),
    element('p', 'バージョン 1.1.0'), element('p', 'キャッシュ gym-log-v11-8'));
  upload.parentElement.classList.add('danger');
  if (!persisted) root.append(element('p', 'ホーム画面に追加して使い、定期的にバックアップを書き出してください。', 'muted'));
  function editExercise(existing) {
    const modal = dialog('dlg-editor', existing ? '種目を編集' : '種目を追加');
    const fields = {
      name: input('名前', existing?.name || ''), name_en: input('英語表記', existing?.name_en || ''),
      body_part: select('部位', parts, existing?.body_part || 'chest'),
      display_unit: select('種目の表示単位', { inherit: '全体設定に従う', kg: 'kg', lb: 'lb' }, existing?.display_unit || 'inherit'),
      increment_lb: input('lbの重量刻み', existing?.increment_lb ?? 5, 'decimal'),
      increment_kg: input('重量刻み', existing?.increment_kg ?? 5, 'decimal'),
      default_rest_seconds: input('目標休憩秒数', existing?.default_rest_seconds ?? rest, 'numeric'),
      setup_note: element('textarea'), is_archived: input('アーカイブ')
    };
    fields.setup_note.value = existing?.setup_note || ''; fields.setup_note.setAttribute('aria-label', 'セッティングメモ');
    fields.is_archived.type = 'checkbox'; fields.is_archived.checked = existing?.is_archived || false;
    const labels = { name: '名前', name_en: '英語表記', body_part: '部位', increment_kg: '重量刻み（kg）', increment_lb: '重量刻み（lb）', display_unit: '種目の表示単位', default_rest_seconds: '目標休憩秒数', setup_note: 'セッティングメモ', is_archived: 'アーカイブ' };
    for (const [key, field] of Object.entries(fields)) modal.append(label(labels[key], field));
    modal.append(button('保存する', async () => {
      const values = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, key === 'is_archived' ? field.checked : field.value]));
      await repo.saveExercise({ ...existing, ...values }, existing); modal.close(); await refresh();
    }, 'primary'), button('やめる', () => modal.close()));
    modal.showModal();
  }
  return () => {};
}
