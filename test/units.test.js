import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LB_IN_KG, lbToKg, kgToLb, roundForDisplay, parseWeightInput, formatWeight } from '../js/lib/units.js';
import { sessionVolume } from '../js/lib/calc.js';
test('1〜500 lbを0.5刻みで往復し表示値が一致する', () => {
  assert.equal(LB_IN_KG, .45359237);
  for (let lb = 1; lb <= 500; lb += .5) {
    assert.equal(roundForDisplay(kgToLb(lbToKg(lb)), 'lb'), lb);
    assert.ok(Math.abs(lbToKg(lb) - lb * LB_IN_KG) <= .00005000001);
  }
});
test('1〜300 kgを0.25刻みで往復し保存値が一致する', () => {
  for (let kg = 1; kg <= 300; kg += .25) assert.equal(lbToKg(kgToLb(kg)), kg);
});
test('入力拒否と100lbの保存値・表示値', () => {
  for (const text of ['', ' ', '-1', '1.2.3', '501', 'Infinity', '1e2']) assert.equal(parseWeightInput(text, 'kg'), null);
  assert.equal(parseWeightInput('1103', 'lb'), null);
  assert.equal(parseWeightInput('100', 'lb'), 45.3592);
  assert.equal(formatWeight(45.3592, 'kg').value, 45.25);
  assert.equal(formatWeight(45.3592, 'lb').value, 100);
});
test('表示の単位切替ではkgで計算した総ボリュームを変更しない', () => {
  const sets = [{ weight: 45.25, reps: 10, deleted_at: null }];
  const before = sessionVolume(sets);
  formatWeight(sets[0].weight, 'lb'); formatWeight(sets[0].weight, 'kg');
  assert.equal(sessionVolume(sets), before);
});

test('全角の重量もkgとlbで半角と同じ値として受け付ける', () => {
  for (const unit of ['kg', 'lb']) {
    for (const [full, half] of [['６０', '60'], ['１０', '10'], ['６２．５', '62.5']]) {
      assert.equal(parseWeightInput(full, unit), parseWeightInput(half, unit));
    }
    for (const text of ['abc', '-5', '', '1.2.3']) assert.equal(parseWeightInput(text, unit), null);
  }
});
