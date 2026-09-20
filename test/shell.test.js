import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('sw.js', root), 'utf8');
test('Service Workerと設定画面のキャッシュ表示が一致する', async () => {
  const cache = source.match(/const CACHE = '([^']+)'/)[1];
  const settings = await readFile(new URL('js/views/settings.js', root), 'utf8');
  assert.ok(settings.includes(`title: 'キャッシュ', value: '${cache}'`));
});
async function files(directory) {
  const entries = await readdir(new URL(directory, root), { withFileTypes: true });
  const lists = await Promise.all(entries.map(entry => entry.isDirectory() ? files(`${directory}${entry.name}/`) : [`./${directory}${entry.name}`]));
  return lists.flat();
}
test('App Shellは配信ファイルを漏れなく含み存在しないファイルを参照しない', async () => {
  const shell = [...source.match(/const SHELL = \[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  const actual = ['./', './index.html', './manifest.webmanifest', './data/exercises.seed.json', ...(await Promise.all(['js/', 'css/', 'icons/'].map(files))).flat()];
  assert.equal(new Set(shell).size, shell.length, 'SHELL内に重複があります');
  assert.deepEqual(shell.slice().sort(), actual.sort(), 'SHELLに不足または実在しないパスがあります');
});
