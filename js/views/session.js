import { listRow, sectionHeading } from './list.js';
import { showSummary } from './summary.js';
import { icon } from './graphics.js';
import { isPastEntry } from '../lib/calendar.js';
import { showExerciseHistory } from './exercise-history.js';
import { filterExercises } from '../lib/history.js';
import { personalRecords, recordAchievements } from '../lib/records.js';
import { weightControl } from './weight-control.js';
import { resolveUnit, weightText, formatTotal } from '../lib/units.js';
import { stopRepeating } from './pointer.js';
import * as repo from '../repo.js';
import { elapsedSeconds, formatElapsed, formatDate } from '../lib/datetime.js';
import { maxWeight, bestMax, previousDifference, increment } from '../lib/calc.js';
import { element, button, numberControl, template, dialog, confirmAction, editText, parts, select, input, increments, showError } from './ui.js';
export async function renderSession(root, session, navigate) {
  const globalUnit = await repo.setting('weight_unit', 'kg');
  let selected = null;
  let added = [];
  let sets = [];
  let exercises = [];
  let previous = new Map();
  let lastAdded;
  let disposed = false;
  const header = document.querySelector('#session-header');
  header.replaceChildren();
  const elapsed = element('span', '', 'muted');
  const cards = element('div');
  const footer = element('footer', '', 'rest');
  const restButton = button('', openRest, 'rest-control'); footer.append(restButton);
  const note = button(session.condition_note || '体調をメモ', () => editText('体調をメモ', session.condition_note, async value => {
    session = await repo.saveSession(session, { condition_note: value }); note.textContent = value || '体調をメモ';
  }), 'note');
  const close = button('', () => navigate('close-session'), 'icon-button'); close.append(icon('close')); close.setAttribute('aria-label', 'セッションを閉じる');
  header.append(close, element('h1', formatDate(session.date)), elapsed, button('終了', async () => {
    if (await confirmAction('トレーニングを終了しますか？')) {
      const completed = await repo.finishSession(session);
      const data = completed.deleted_at === null ? await repo.sessionSummary(completed) : null;
      await navigate('home');
      if (data) showSummary(completed, data, globalUnit);
    }
  }));
  root.replaceChildren(note, cards, button('＋ 種目を追加', openPicker, 'wide'), footer);
  let defaultRest = await repo.setting('default_rest_seconds', 90);
  function tick() {
    elapsed.textContent = isPastEntry(session) ? '過去の記録' : formatElapsed(elapsedSeconds(session.started_at, Date.now()));
    const last = sets.at(-1);
    footer.hidden = !last || isPastEntry(session);
    requestAnimationFrame(() => root.style.setProperty('--rest-offset', `${footer.getBoundingClientRect().height}px`));
    if (!last) return;
    const seconds = elapsedSeconds(last.recorded_at, Date.now());
    const target = exercises.find(row => row.id === (selected || last.exercise_id))?.default_rest_seconds ?? defaultRest;
    restButton.textContent = `休憩 ${formatElapsed(seconds)}${target > 0 && seconds >= target ? ` / ${target}秒` : ''}`;
    footer.classList.toggle('reached', target > 0 && seconds >= target);
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
    if (!ids.length) cards.append(element('p', '最初の種目を選びましょう', 'empty-message'), button('種目を選ぶ', openPicker, 'primary'));
    for (const id of ids) {
      const exercise = exercises.find(row => row.id === id);
      if (!exercise) continue;
      const today = sets.filter(row => row.exercise_id === id);
      const prev = previous.get(id);
      const card = template('tpl-exercise-card');
      card.dataset.exercise = id;
      card.classList.toggle('is-open', selected === id);
      const toggle = button('', () => {
        const height = card.getBoundingClientRect().height;
        selected = selected === id ? null : id; lastAdded = null; paint(); tick();
        const next = [...cards.children].find(node => node.dataset.exercise === id);
        if (next && !matchMedia('(prefers-reduced-motion: reduce)').matches) next.animate([{ height: `${height}px` }, { height: `${next.getBoundingClientRect().height}px` }], { duration: 140, easing: 'ease-out' });
      }, 'card-heading');
      toggle.setAttribute('aria-expanded', String(selected === id));
      toggle.append(element('span', `${today.length}セット / 最大${weightText(maxWeight(today), resolveUnit(exercise, globalUnit))}`));
      toggle.append(icon('close'));
      const name = button(exercise.name, () => showExerciseHistory(exercise, resolveUnit(exercise, globalUnit), reload), 'exercise-name');
      const heading = element('h2'); heading.append(name);
      toggle.setAttribute('aria-label', `${exercise.name}の入力を${selected === id ? '閉じる' : '開く'}`);
      card.append(heading, toggle);
      if (today.length) card.append(element('p', `推定1RM ${formatTotal(bestMax(today), resolveUnit(exercise, globalUnit))}${prev ? ` / 前回比 ${formatTotal(previousDifference(today, prev.sets), resolveUnit(exercise, globalUnit))}` : ''}`, 'muted'));
      if (selected === id) expanded(card, exercise, today, prev);
      cards.append(card);
    }
  }
  function expanded(card, exercise, today, prev) {
    const initial = today.at(-1) || prev?.sets[0];
    const unit = resolveUnit(exercise, globalUnit);
    const incrementKey = `increment_${unit}`;
    const weight = weightControl(initial?.weight, unit, exercise[incrementKey]);
    const reps = numberControl('回', initial?.reps ?? '', 1, 1, 100, 'numeric');
    weight.field.setAttribute('aria-label', '重量'); reps.field.setAttribute('aria-label', 'レップ');
    weight.field.classList.add('weight-input');
    const prLine = element('p', '', 'muted pr-line');
    card.append(prLine);
    const badges = new Map();
    card.append(element('p', prev ? `前回 ${formatDate(prev.date)}` : 'この種目は初回です', 'muted'));
    for (const set of prev?.sets || []) {
      const row = template('tpl-prev-set-row');
      row.textContent = `${weightText(set.weight, unit)} × ${set.reps}${set.note ? ` 「${set.note}」` : ''}`;
      row.setAttribute('aria-label', `${row.textContent} 前回の値を入力する`);
      row.addEventListener('click', () => { weight.setKg(set.weight); reps.field.value = set.reps; });
      card.append(row);
    }
    card.append(element('h2', isPastEntry(session) ? 'この日の記録' : '今日'));
    for (const set of today) {
      const row = template('tpl-set-row');
      if (set.id === lastAdded) row.classList.add('just-added');
      row.append(button(`${weightText(set.weight, unit)} × ${set.reps}`, () => editSet(set), 'set-value'));
      const mark = button('', () => {
        if (row.querySelector('textarea')) return;
        const editor = element('div', undefined, 'inline-note');
        const field = element('textarea'); field.value = set.note; field.setAttribute('aria-label', 'セットのメモ');
        editor.append(field, button('保存する', async () => { await repo.saveSetNote(set, field.value); lastAdded = null; await reload(); }), button('やめる', () => editor.remove()));
        row.append(editor);
      }, set.note ? 'has-note' : '');
      mark.append(icon('note'));
      mark.setAttribute('aria-label', 'セットのメモを編集');
      row.append(mark);
      if (set.note) row.append(element('p', set.note, 'memo'));
      const badge = element('span', '', 'pr-badge'); row.append(badge); badges.set(set.id, badge);
      card.append(row);
    }
    repo.exerciseSets(exercise.id).then(history => {
      if (!card.isConnected) return;
      const pr = personalRecords(history);
      prLine.textContent = pr.weightSet ? `自己ベスト ${weightText(pr.weightSet.weight, unit)} × ${pr.weightSet.reps} / 推定1RM ${formatTotal(pr.estimated, unit)}` : '';
      for (const [id, updates] of recordAchievements(history)) {
        const badge = badges.get(id);
        if (badge && updates.length) { badge.textContent = '自己ベスト'; badge.setAttribute('aria-label', `自己ベスト: ${updates.join('、')}`); }
      }
    }).catch(showError);
    const controls = element('div', undefined, 'controls');
    controls.append(weight.group, increments(weight, exercise[incrementKey], async step => {
      const updated = await repo.saveExercise({ ...exercise, [incrementKey]: step }, exercise);
      Object.assign(exercise, updated);
    }), reps.group);
    if (exercise.load_type === 'plate') controls.append(element('p', '合計（両側）', 'muted'));
    const record = button('記録する', async () => {
      const row = await repo.saveSet(session.id, exercise.id, weight.kg(), reps.field.value);
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
    const modal = dialog('dlg-set', 'セットを編集');
    const memo = element('textarea'); memo.value = set.note; memo.setAttribute('aria-label', 'セットのメモ');
    const exercise = exercises.find(row => row.id === set.exercise_id);
    const weight = weightControl(set.weight, resolveUnit(exercise, globalUnit), exercise[`increment_${resolveUnit(exercise, globalUnit)}`]);
    const reps = numberControl('回', set.reps, 1, 1, 100, 'numeric');
    modal.append(weight.group, reps.group, memo, button('保存する', async () => {
      await repo.saveSet(session.id, set.exercise_id, weight.kg(), reps.field.value, { ...set, note: memo.value }); modal.close(); lastAdded = null; await reload();
    }, 'primary'), button('セットを削除する', async () => {
      if (await confirmAction('このセットを削除しますか？')) { await repo.deleteSet(set); modal.close(); lastAdded = null; await reload(); }
    }, 'danger'), button('やめる', () => modal.close()));
    modal.showModal();
  }
  function openRest() {
    const exercise = exercises.find(row => row.id === (selected || sets.at(-1)?.exercise_id));
    if (!exercise) return;
    const modal = dialog('dlg-rest', `${exercise.name}の休憩`);
    const value = element('p', `${exercise.default_rest_seconds}秒`, 'rest-target');
    const adjust = async delta => {
      const seconds = increment(exercise.default_rest_seconds, delta, 0, 600);
      Object.assign(exercise, await repo.saveExercise({ ...exercise, default_rest_seconds: seconds }, exercise));
      value.textContent = `${seconds}秒${seconds === 0 ? '（色の変化なし）' : ''}`; tick();
    };
    modal.append(value, button('−15秒', () => adjust(-15)), button('+15秒', () => adjust(15)), button('閉じる', () => modal.close()));
    modal.showModal();
  }
  async function openPicker() {
    const rows = await repo.pickerExercises();
    const modal = dialog('dlg-exercise-picker', '種目を選ぶ');
    const filters = element('div', undefined, 'filters');
    const list = element('div');
    const search = input('種目名で検索'); search.placeholder = '種目名・英語名で検索';
    const searchBox = element('div', undefined, 'search-field'); searchBox.append(icon('search'), search);
    let selectedPart = '';
    search.addEventListener('input', () => filter(selectedPart));
    function filter(part) {
      selectedPart = part;
      for (const node of filters.children) node.setAttribute('aria-pressed', String(node.dataset.part === part));
      list.replaceChildren();
      const matches = filterExercises(rows, part, search.value);
      list.append(sectionHeading(part ? parts[part] : '種目', matches.length));
      for (const exercise of matches) {
        list.append(listRow({ title: exercise.name, symbol: exercise.body_part, value: sets.some(row => row.exercise_id === exercise.id) ? '記録済' : '', action: async () => {
          added.push(exercise.id); selected = exercise.id; modal.close(); await reload();
        } }));
      }
    }
    for (const [key, text] of Object.entries({ '': 'すべて', ...parts })) {
      const control = button(text, () => filter(key)); control.dataset.part = key; filters.append(control);
    }
    modal.append(button('閉じる', () => modal.close()), searchBox, filters, list, button('＋ 種目を新規作成', () => {
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
