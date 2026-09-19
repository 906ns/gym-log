import { showSessionHistory } from './session-history.js';
import { chart, icon } from './graphics.js';
import { weekStart, daysBetween } from '../lib/insights.js';
import { monthGrid, shiftMonth, isPastEntry } from '../lib/calendar.js';
import { weightControl } from './weight-control.js';
import { weightText, formatTotal, kgToLb, resolveUnit } from '../lib/units.js';
import * as repo from '../repo.js';
import { dateKey, formatDate, elapsedSeconds, formatElapsed } from '../lib/datetime.js';
import { signedDifference } from '../lib/calc.js';
import { element, button, numberControl, input, label, template, dialog, confirmAction } from './ui.js';
export async function renderHome(root, navigate) {
  const [weights, current, history, showFat] = await Promise.all([repo.latestWeights(), repo.currentSession(), repo.recentSessions(8), repo.setting('show_body_fat', true)]);
  const unit = await repo.setting('weight_unit', 'kg');
  const latest = weights[0];
  const today = dateKey(new Date());
  const week = (await repo.sessionsBetween(weekStart(today), today)).filter(row => row.ended_at !== null);
  const overview = element('header', undefined, 'week-overview');
  const heading = element('div', undefined, 'overview-heading');
  heading.append(element('h2', '今週のトレーニング'));
  const number = element('div', undefined, 'week-number'); number.append(element('strong', String(week.length)), element('span', '回'));
  const last = history[0] ? `前回から ${daysBetween(history[0].date, today)}日` : '最初の記録を始めましょう';
  overview.append(heading, number, element('p', last, 'muted'));
  if (history.length) {
    const trend = element('div', undefined, 'home-trend');
    trend.append(element('span', '最近8回の総ボリューム', 'muted'), chart([...history].reverse().map(row => row.volume), '直近8セッションの総ボリュームの推移'));
    overview.append(trend);
  }

  const body = button('', openBody, 'body-card');
  if (!latest) body.textContent = '体重を記録する';
  else {
    body.append(element('span', '体重'), element('strong', weightText(latest.weight, unit), 'body-value'));
    if (weights[1]) body.append(element('span', signedDifference(unit === 'lb' ? kgToLb(latest.weight) : latest.weight, unit === 'lb' ? kgToLb(weights[1].weight) : weights[1].weight), 'difference'));
    body.append(element('p', `${formatDate(latest.date)}に測定`, 'muted'));
    if (latest.body_fat !== null) body.append(element('p', `体脂肪率 ${latest.body_fat.toFixed(1)}%`, 'muted'));
  }
  const start = button(current ? 'トレーニングを続ける' : '今日のトレーニングを開始', async () => navigate('session', current || await repo.startSession()), 'primary');
  const calendar = element('section', undefined, 'calendar');
  const past = button('過去の日付で記録する', () => {
    const modal = dialog('dlg-editor', '過去の日付で記録する');
    const date = input('トレーニングの日付'); date.type = 'date'; date.max = dateKey(new Date(Date.now() - 86400000));
    modal.append(label('日付', date), button('記録を始める', async () => {
      const session = await repo.startSession(date.value); modal.close(); await navigate('session', session);
    }, 'primary'), button('やめる', () => modal.close())); modal.showModal();
  }, 'wide quiet');
  past.disabled = Boolean(current);
  if (current) past.title = '現在のセッションを終了してから記録できます';
  root.replaceChildren(overview, start, past, body, calendar);
  await renderMonth(dateKey(new Date()));
  let timer;
  if (current) {
    const update = () => { start.textContent = `トレーニングを続ける${isPastEntry(current) ? '（過去の記録）' : ` ${formatElapsed(elapsedSeconds(current.started_at, Date.now()))}`}`; };
    update(); timer = setInterval(update, 1000);
  }
  async function renderMonth(key) {
    const grid = monthGrid(key);
    const sessions = await repo.sessionsBetween(grid.first, grid.last);
    const header = element('div', undefined, 'calendar-heading');
    header.append(button('前月', () => renderMonth(shiftMonth(key, -1))), element('h2', `${grid.label} / ${sessions.length}回`), button('翌月', () => renderMonth(shiftMonth(key, 1))));
    const days = element('div', undefined, 'calendar-grid');
    for (const day of ['月', '火', '水', '木', '金', '土', '日']) days.append(element('span', day, 'weekday'));
    for (const date of grid.cells) {
      if (!date) { days.append(element('span')); continue; }
      const entries = sessions.filter(row => row.date === date).sort((a, b) => b.started_at - a.started_at);
      const control = button(String(Number(date.slice(-2))), async () => {
        if (entries.length === 1) { await openDaySession(entries[0]); return; }
        const modal = dialog('dlg-history', formatDate(date));
        for (const entry of entries) modal.append(button(`${new Date(entry.started_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}${entry.ended_at === null ? ' 進行中' : ''}`, async () => { modal.close(); await openDaySession(entry); }, 'wide'));
        modal.append(button('閉じる', () => modal.close())); modal.showModal();
      }, 'calendar-day');
      control.disabled = !entries.length;
      control.setAttribute('aria-label', `${formatDate(date)} ${entries.length}回`);
      if (date === dateKey(new Date())) control.setAttribute('aria-current', 'date');
      if (entries.length) control.append(element('span', '', 'calendar-dot'));
      days.append(control);
    }
    calendar.replaceChildren(header, days);
  }
  async function openDaySession(session) {
    if (session.ended_at === null) await navigate('session', session);
    else await showSessionHistory({ ...session, sets: await repo.sessionSets(session.id) }, () => navigate('home')); 
  }
  function openBody() {
    const modal = dialog('dlg-body-weight', '体重を記録');
    const date = input('測定日', dateKey(new Date())); date.type = 'date';
    const weight = weightControl(latest?.weight, unit, .1);
    const fat = numberControl('%', latest?.body_fat ?? '', .1, 0, 100);
    weight.field.setAttribute('aria-label', '体重'); fat.field.setAttribute('aria-label', '体脂肪率');
    modal.append(label('測定日', date), weight.group);
    if (showFat) modal.append(element('p', '体脂肪率（任意）'), fat.group);
    modal.append(button('記録する', async () => {
      await repo.saveWeight(date.value, weight.kg(), showFat ? fat.field.value : null); modal.close(); await navigate('home');
    }, 'primary'), button('やめる', () => modal.close()));
    modal.showModal();
  }
  return () => clearInterval(timer);
}
