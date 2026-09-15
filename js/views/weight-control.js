import { numberControl } from './ui.js';
import { inputWeight, parseWeightInput, kgToLb } from '../lib/units.js';
export function weightControl(kg, unit, step) {
  const control = numberControl(unit, kg === undefined ? '' : inputWeight(kg, unit), step, 0, unit === 'lb' ? Math.floor(kgToLb(500) * 2) / 2 : 500);
  let original = kg;
  let initial = control.field.value;
  control.field.setAttribute('aria-label', '重量');
  return { ...control,
    kg() {
      // 表示の丸めで既存の保存値を書き換えない。未編集なら元のkgを返す。
      if (original !== undefined && control.field.value === initial) return original;
      const value = parseWeightInput(control.field.value, unit);
      if (value === null) throw new Error(`0〜500 kgに相当する重量を半角数字で入力してください（表示: ${unit}）`);
      return value;
    },
    setKg(value) { original = value; control.field.value = inputWeight(value, unit); initial = control.field.value; }
  };
}
