import * as repo from '../repo.js';
import { dateKey, formatDate, elapsedSeconds, formatElapsed } from '../lib/datetime.js';
import { signedDifference } from '../lib/calc.js';
import { element, button, numberControl, input, label, template, dialog, confirmAction } from './ui.js';
export async function renderHome(root, navigate) {
  const [weights, current, history, showFat] = await Promise.all([repo.latestWeights(), repo.currentSession(), repo.recentSessions(), repo.setting('show_body_fat', true)]);
  const latest = weights[0];
  const body = button('', openBody, 'body-card');
  if (!latest) body.textContent = '体重を記録する';
  else {
    body.append(element('span', '体重'), element('strong', `${latest.weight.toFixed(1)} kg`, 'body-value'));
    if (weights[1]) body.append(element('span', signedDifference(latest.weight, weights[1].weight), 'difference'));
    body.append(element('p', `${formatDate(latest.date)}に測定`, 'muted'));
    if (latest.body_fat !== null) body.append(element('p', `体脂肪率 ${latest.body_fat.toFixed(1)}%`, 'muted'));
  }
  const start = button(current ? 'トレーニングを続ける' : '今日のトレーニングを開始', async () => navigate('session', current || await repo.startSession()), 'primary');
  const historyList = element('div');
  if (!history.length) historyList.append(element('p', 'まだ記録がありません', 'muted'));
  for (const session of history) {
    const row = template('tpl-history-row');
    row.append(element('span', formatDate(session.date)), element('span', `${session.exerciseCount}種目 / ${session.volume.toLocaleString('ja-JP')} kg`));
    if (session.condition_note) row.append(element('span', session.condition_note.split('\n')[0], 'muted'));
    row.addEventListener('click', () => openHistory(session).catch(error => { console.error(error); alert(error.message); }));
    historyList.append(row);
  }
  root.replaceChildren(element('h1', '筋トレ記録'), body, start, element('h2', '最近'), historyList, button('設定', () => navigate('settings'), 'settings-link'));
  let timer;
  if (current) {
    const update = () => { start.textContent = `トレーニングを続ける ${formatElapsed(elapsedSeconds(current.started_at, Date.now()))}`; };
    update(); timer = setInterval(update, 1000);
  }
  function openBody() {
    const modal = dialog('dlg-body-weight', '体重を記録');
    const date = input('測定日', dateKey(new Date())); date.type = 'date';
    const weight = numberControl('kg', latest?.weight ?? '', .1, .1, 500);
    const fat = numberControl('%', latest?.body_fat ?? '', .1, 0, 100);
    weight.field.setAttribute('aria-label', '体重'); fat.field.setAttribute('aria-label', '体脂肪率');
    modal.append(label('測定日', date), weight.group);
    if (showFat) modal.append(element('p', '体脂肪率（任意）'), fat.group);
    modal.append(button('記録する', async () => {
      await repo.saveWeight(date.value, weight.field.value, showFat ? fat.field.value : null); modal.close(); await navigate('home');
    }, 'primary'), button('やめる', () => modal.close()));
    modal.showModal();
  }
  async function openHistory(session) {
    const exercises = await repo.exercises();
    const modal = dialog('dlg-editor', formatDate(session.date));
    if (session.condition_note) modal.append(element('p', session.condition_note, 'memo'));
    for (const id of new Set(session.sets.map(row => row.exercise_id))) {
      modal.append(element('h2', exercises.find(row => row.id === id)?.name || '種目'));
      for (const set of session.sets.filter(row => row.exercise_id === id)) modal.append(element('p', `${set.weight} kg × ${set.reps}${set.note ? ` 「${set.note}」` : ''}`, 'memo'));
    }
    modal.append(button('閉じる', () => modal.close()), button('セッションを削除する', async () => {
      if (await confirmAction('このセッションとセットを削除しますか？')) {
        await repo.deleteSession(session); modal.close(); await navigate('home');
      }
    }, 'danger'));
    modal.showModal();
  }
  return () => clearInterval(timer);
}
