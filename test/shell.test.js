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
