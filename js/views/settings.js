import { saveGlassAppearance, syncGlassAppearance } from './glass.js';
import { syncTheme, themeMode, setTheme } from './theme.js';
import { listRow, groupedList, sectionHeading } from './list.js';
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
  const themeControls = element('div', undefined, 'theme-controls');
  themeControls.setAttribute('aria-label', 'テーマ');
  for (const [value, title] of [['dark', 'ダーク'], ['light', 'ライト'], ['system', 'システムに従う']]) {
    const control = button(title, async () => {
      await setTheme(value);
      for (const node of themeControls.children) node.setAttribute('aria-pressed', String(node === control));
    });
    control.setAttribute('aria-pressed', String(themeMode() === value)); themeControls.append(control);
  }
  const transparency = input('透明度オフ'); transparency.type = 'checkbox';
  transparency.checked = document.documentElement.dataset.glass === 'off';
  transparency.addEventListener('change', () => saveGlassAppearance(!transparency.checked).catch(showError));
  const glassRow = listRow({ title: '透明度オフ', subtitle: 'ナビゲーションを不透明にする', control: transparency });
  const refresh = () => navigate('settings');
  const list = groupedList(exercises, row => row.body_part, row => parts[row.body_part], exercise => listRow({ title: exercise.name, subtitle: exercise.is_archived ? 'アーカイブ' : exercise.name_en, value: { selectorized: 'セレクタライズ', plate: 'プレート', bodyweight: '自重' }[exercise.load_type], symbol: exercise.body_part, action: () => editExercise(exercise) }));
  const fat = input('体脂肪率を入力する'); fat.type = 'checkbox'; fat.checked = showFat;
  fat.addEventListener('change', () => repo.saveSetting('show_body_fat', fat.checked).catch(showError));
  const upload = input('バックアップファイル'); upload.type = 'file'; upload.accept = '.json,application/json';
  upload.addEventListener('change', async () => {
    const file = upload.files[0]; if (!file) return;
    try {
      const text = await file.text(); repo.validateBackup(text);
      if (await confirmAction('現在の記録がすべて置き換わります。復元しますか？')) {
        await repo.importBackup(text); await syncTheme(); await syncGlassAppearance(); await navigate('home');
      }
    } catch (error) { showError(error); }
    finally { upload.value = ''; }
  });
  let persisted = false;
  try { persisted = await navigator.storage?.persisted?.() || false; }
  catch (error) { console.error(error); }
  const exportRow = listRow({ title: 'バックアップを書き出す', symbol: 'history', action: async () => {
    const text = await repo.exportBackup(); const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = element('a'); link.href = url; link.download = `gym-log-${dateKey(new Date())}.json`; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } });
  const importRow = listRow({ title: 'バックアップから復元する', symbol: 'history', action: () => upload.click() });
  importRow.classList.add('danger'); upload.hidden = true;
  const restRow = listRow({ title: '目標休憩秒数', value: `${rest}秒`, symbol: 'history', action: () => {
    const modal = dialog('dlg-editor', '目標休憩秒数'); const field = input('秒数', rest, 'numeric');
    modal.append(field, button('保存する', async () => { await repo.saveSetting('default_rest_seconds', numberInput(field.value, 0, 600, true)); modal.close(); await refresh(); }, 'primary'), button('やめる', () => modal.close()));
    modal.showModal();
  } });
  root.replaceChildren(sectionHeading('表示', 2), themeControls, glassRow, list,
    listRow({ title: '種目を追加', symbol: 'add', action: () => editExercise() }), sectionHeading('トレーニング', 3),
    listRow({ title: '重量の表示単位', symbol: 'weight', control: unitControls }), restRow,
    listRow({ title: '体脂肪率を入力する', symbol: 'weight', control: fat }), sectionHeading('データ', 4),
    exportRow, importRow, upload, listRow({ title: 'データの保持', value: persisted ? '許可' : '未許可' }),
    listRow({ title: '保存した記録', subtitle: `セッション ${counts[0]} / セット ${counts[1]} / 体重 ${counts[2]}`, symbol: 'history' }), sectionHeading('このアプリ', 2),
    listRow({ title: 'バージョン', value: '1.2.0' }), listRow({ title: 'キャッシュ', value: 'gym-log-glass-5' }));
  let section;
  for (const node of [...root.children]) {
    if (node.classList.contains('section-heading')) {
      section = element('section', undefined, 'list-section'); root.insertBefore(section, node); section.append(node);
    } else if (node === list) section = null;
    else if (section) section.append(node);
  }
  if (!persisted) root.append(element('p', 'ホーム画面に追加して使い、定期的にバックアップを書き出してください。', 'muted'));
  function editExercise(existing) {
    const modal = dialog('dlg-exercise', existing ? '種目を編集' : '種目を追加');
    const form = element('div', undefined, 'detail-content'); modal.append(form);
    if (existing) {
      const index = exercises.findIndex(row => row.id === existing.id);
      const controls = element('div', undefined, 'reorder-controls');
      for (const [delta, text] of [[-1, '上へ移動'], [1, '下へ移動']]) {
        const move = button(text, async () => {
          const changed = [...exercises]; [changed[index], changed[index + delta]] = [changed[index + delta], changed[index]];
          await repo.reorderExercises(changed); modal.close(); await refresh();
        });
        move.disabled = index + delta < 0 || index + delta >= exercises.length;
        controls.append(move);
      }
      form.append(controls);
    }
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
    for (const [key, field] of Object.entries(fields)) form.append(label(labels[key], field));
    form.append(button('保存する', async () => {
      const values = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, key === 'is_archived' ? field.checked : field.value]));
      await repo.saveExercise({ ...existing, ...values }, existing); modal.close(); await refresh();
    }, 'primary'), button('やめる', () => modal.close()));
    modal.showModal();
  }
  return () => {};
}
