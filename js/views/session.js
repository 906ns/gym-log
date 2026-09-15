import { stopRepeating } from './pointer.js';
import * as repo from '../repo.js';
import { elapsedSeconds, formatElapsed, formatDate } from '../lib/datetime.js';
import { maxWeight, bestMax, previousDifference } from '../lib/calc.js';
import { element, button, numberControl, template, dialog, confirmAction, editText, parts, select, input, increments } from './ui.js';
export async function renderSession(root, session, navigate) {
  let selected = null;
  let added = [];
  let sets = [];
  let exercises = [];
  let previous = new Map();
  let lastAdded;
  let disposed = false;
  const header = element('header');
  const elapsed = element('span', '', 'muted');
  const cards = element('div');
  const footer = element('footer', '', 'rest');
  const note = button(session.condition_note || '体調をメモ', () => editText('体調をメモ', session.condition_note, async value => {
    session = await repo.saveSession(session, { condition_note: value }); note.textContent = value || '体調をメモ';
  }), 'note');
  header.append(button('ホーム', () => navigate('home')), element('h1', formatDate(session.date)), elapsed, button('終了', async () => {
    if (await confirmAction('トレーニングを終了しますか？')) { await repo.finishSession(session); await navigate('home'); }
  }));
  root.replaceChildren(header, note, cards, button('＋ 種目を追加', openPicker, 'wide'), footer);
  let defaultRest = await repo.setting('default_rest_seconds', 90);
  function tick() {
    elapsed.textContent = formatElapsed(elapsedSeconds(session.started_at, Date.now()));
    const last = sets.at(-1);
    footer.hidden = !last;
    requestAnimationFrame(() => root.style.setProperty('--rest-offset', `${footer.getBoundingClientRect().height}px`));
    if (!last) return;
    const seconds = elapsedSeconds(last.recorded_at, Date.now());
    const target = exercises.find(row => row.id === last.exercise_id)?.default_rest_seconds || defaultRest;
    footer.textContent = `休憩 ${formatElapsed(seconds)}${seconds >= target ? ` / ${target}秒` : ''}`;
    footer.classList.toggle('reached', seconds >= target);
  }
  async function reload() {
    [sets, exercises] = await Promise.all([repo.sessionSets(session.id), repo.exercises()]);
    const ids = [...new Set([...sets.map(row => row.exercise_id), ...added])];
    const results = await Promise.all(ids.map(id => repo.previousSets(id, session.id)));
    previous = new Map(ids.map((id, index) => [id, results[index]]));
    if (disposed) return;
    paint(); tick();
  }
  function paint() {
    stopRepeating();
    cards.replaceChildren();
    const ids = [...new Set([...sets.map(row => row.exercise_id), ...added])];
    if (!ids.length) cards.append(element('p', '種目を追加して記録を始めましょう', 'muted'));
    for (const id of ids) {
      const exercise = exercises.find(row => row.id === id);
      if (!exercise) continue;
      const today = sets.filter(row => row.exercise_id === id);
      const prev = previous.get(id);
      const card = template('tpl-exercise-card');
      const toggle = button('', () => { selected = selected === id ? null : id; paint(); }, 'card-heading');
      toggle.setAttribute('aria-expanded', String(selected === id));
      toggle.append(element('h2', exercise.name), element('span', `${today.length}セット / 最大${maxWeight(today)} kg`));
      card.append(toggle);
      if (today.length) card.append(element('p', `推定1RM ${bestMax(today)} kg${prev ? ` / 前回比 ${previousDifference(today, prev.sets)} kg` : ''}`, 'muted'));
      if (selected === id) expanded(card, exercise, today, prev);
      cards.append(card);
    }
  }
  function expanded(card, exercise, today, prev) {
    const initial = today.at(-1) || prev?.sets[0];
    const weight = numberControl('kg', initial?.weight ?? '', exercise.increment_kg, 0, 500);
    const reps = numberControl('回', initial?.reps ?? '', 1, 1, 100, 'numeric');
    weight.field.setAttribute('aria-label', '重量'); reps.field.setAttribute('aria-label', 'レップ');
    weight.field.classList.add('weight-input');
    card.append(element('p', prev ? `前回 ${formatDate(prev.date)}` : 'この種目は初回です', 'muted'));
    for (const set of prev?.sets || []) {
      const row = template('tpl-prev-set-row');
      row.textContent = `${set.weight} kg × ${set.reps}${set.note ? ` 「${set.note}」` : ''} ↩`;
      row.setAttribute('aria-label', `${row.textContent} 前回の値を入力する`);
      row.addEventListener('click', () => { weight.field.value = set.weight; reps.field.value = set.reps; });
      card.append(row);
    }
    card.append(element('h2', '今日'));
    for (const set of today) {
      const row = template('tpl-set-row');
      if (set.id === lastAdded) row.classList.add('just-added');
      row.append(button(`${set.weight} kg × ${set.reps}`, () => editSet(set), 'set-value'));
      const mark = button(set.note ? '✎ ●' : '✎', () => {
        if (row.querySelector('textarea')) return;
        const editor = element('div', undefined, 'inline-note');
        const field = element('textarea'); field.value = set.note; field.setAttribute('aria-label', 'セットのメモ');
        editor.append(field, button('保存する', async () => { await repo.saveSetNote(set, field.value); lastAdded = null; await reload(); }), button('やめる', () => editor.remove()));
        row.append(editor);
      }, set.note ? 'has-note' : '');
      mark.setAttribute('aria-label', 'セットのメモを編集');
      row.append(mark);
      if (set.note) row.append(element('p', set.note, 'memo'));
      card.append(row);
    }
    const controls = element('div', undefined, 'controls');
    controls.append(weight.group, increments(weight, exercise.increment_kg, async step => {
      const updated = await repo.saveExercise({ ...exercise, increment_kg: step }, exercise);
      Object.assign(exercise, updated);
    }), reps.group);
    if (exercise.load_type === 'plate') controls.append(element('p', '合計（両側）', 'muted'));
    const record = button('記録する', async () => {
      const row = await repo.saveSet(session.id, exercise.id, weight.field.value, reps.field.value);
      lastAdded = row.id; await reload();
    }, 'primary');
    for (const field of [weight.field, reps.field]) field.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); record.click(); } });
    controls.append(record);
    card.append(controls);
    if (exercise.setup_note) card.append(button(exercise.setup_note, () => editText('セッティング', exercise.setup_note, async value => {
      await repo.saveExercise({ ...exercise, setup_note: value }, exercise); await reload();
    }), 'note'));
  }
  function editSet(set) {
    const modal = dialog('dlg-editor', 'セットを編集');
    const exercise = exercises.find(row => row.id === set.exercise_id);
    const weight = numberControl('kg', set.weight, exercise.increment_kg, 0, 500);
    const reps = numberControl('回', set.reps, 1, 1, 100, 'numeric');
    modal.append(weight.group, reps.group, button('保存する', async () => {
      await repo.saveSet(session.id, set.exercise_id, weight.field.value, reps.field.value, set); modal.close(); lastAdded = null; await reload();
    }, 'primary'), button('セットを削除する', async () => {
      if (await confirmAction('このセットを削除しますか？')) { await repo.deleteSet(set); modal.close(); lastAdded = null; await reload(); }
    }, 'danger'), button('やめる', () => modal.close()));
    modal.showModal();
  }
  async function openPicker() {
    const rows = await repo.pickerExercises();
    const modal = dialog('dlg-exercise-picker', '種目を選ぶ');
    const filters = element('div', undefined, 'filters');
    const list = element('div');
    function filter(part) {
      for (const node of filters.children) node.setAttribute('aria-pressed', String(node.dataset.part === part));
      list.replaceChildren();
      for (const exercise of rows.filter(row => !part || row.body_part === part)) {
        list.append(button(`${exercise.name}${sets.some(row => row.exercise_id === exercise.id) ? ' 記録済' : ''}`, async () => {
          added.push(exercise.id); selected = exercise.id; modal.close(); await reload();
        }, 'wide'));
      }
    }
    for (const [key, text] of Object.entries({ '': 'すべて', ...parts })) {
      const control = button(text, () => filter(key)); control.dataset.part = key; filters.append(control);
    }
    modal.append(button('閉じる', () => modal.close()), filters, list, button('＋ 種目を新規作成', () => {
      const form = dialog('dlg-editor', '種目を新規作成');
      const name = input('種目名'); const part = select('部位', parts, 'chest');
      form.append(name, part, button('作成する', async () => {
        const exercise = await repo.saveExercise({ name: name.value, body_part: part.value });
        added.push(exercise.id); selected = exercise.id; form.close(); modal.close(); await reload();
      }, 'primary'), button('やめる', () => form.close()));
      form.showModal();
    }, 'wide'));
    filter(''); modal.showModal();
  }
  await reload();
  const timer = setInterval(tick, 1000);
  return () => { disposed = true; clearInterval(timer); stopRepeating(); };
}
