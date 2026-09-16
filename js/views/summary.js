import { formatElapsed, formatDate } from '../lib/datetime.js';
import { formatTotal } from '../lib/units.js';
import { element, button, dialog } from './ui.js';
import { icon } from './graphics.js';
export function showSummary(session, data, unit) {
  const modal = dialog('dlg-summary', 'トレーニングを記録しました');
  const seal = element('div', undefined, 'summary-seal'); seal.append(icon('check'));
  const volume = element('div', undefined, 'summary-volume');
  volume.append(element('span', '総ボリューム', 'muted'), element('strong', formatTotal(data.volume, unit)));
  const grid = element('dl', undefined, 'summary-grid');
  for (const [label, value] of [['所要時間', data.duration === null ? '未記録' : formatElapsed(data.duration)], ['種目', `${data.exercises}種目`], ['セット', `${data.sets}セット`], ['自己ベスト更新', `${data.records}件`]]) {
    const item = element('div'); item.append(element('dt', label), element('dd', value)); grid.append(item);
  }
  modal.prepend(seal); modal.append(element('p', formatDate(session.date), 'muted'), volume, grid, button('ホームへ戻る', () => modal.close(), 'primary'));
  modal.showModal();
}
