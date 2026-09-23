# データモデル

## 0. 設計の前提

v1 は端末内で完結するが、**v2 でサーバー同期を後付けできる形**にしておく。
そのために以下を最初から守る。後から入れると既存データの移行が必要になり、
実質作り直しになる。

| 規約 | 理由 |
| --- | --- |
| 主キーは UUID v4（`crypto.randomUUID()`） | サーバー側の自動採番に依存すると、オフラインで作ったレコードに ID を振れない |
| 全レコードに `updated_at` | 同期時にどちらが新しいか判定するため |
| 削除は `deleted_at` による論理削除 | 物理削除だと「削除した」という事実が同期先に伝わらず、復活する |
| 日付は `'YYYY-MM-DD'` 文字列 | `Date` を保存するとタイムゾーンで日付がずれる |
| 時刻は UTC エポックミリ秒（number） | 比較と差分計算が単純になり、シリアライズで壊れない |

同期そのものは v1 では実装しない。上記4点を守るだけでよい。

---

## 1. 共通フィールド

すべてのストアのレコードが以下を持つ。

```js
{
  id: '6f79e181-16a3-48d2-a5e1-d62ff1d6bf25', // UUID v4
  created_at: 1757900000000,                  // Date.now()
  updated_at: 1757900000000,                  // Date.now()
  deleted_at: null                            // number | null
}
```

`crypto.randomUUID()` は Safari 15.4 以降で使える。HTTPS（または localhost）が必要で、
GitHub Pages は HTTPS なので問題ない。フォールバックは実装しない。

---

## 2. ストア定義

### 2.1 `exercises` — 種目マスタ

```js
{
  id: string,
  name: string,                  // 'チェストプレス'
  name_en: string,               // 'Chest Press'（マシンの英語表記の照合用）
  body_part: 'chest' | 'back' | 'shoulders' | 'legs',
  load_type: 'selectorized' | 'plate' | 'bodyweight',
  weight_increment: number,      // ±ボタンの増減値（kg）
  default_rest_seconds: number,  // 目標休憩秒数
  setup_note: string,            // 'シート4、背もたれ2'。初期値は空文字
  sort_order: number,            // 設定画面での並び順
  is_archived: boolean,          // true なら種目ピッカーに出さない
  created_at, updated_at, deleted_at
}
```

- `keyPath`: `id`
- インデックス:
  - `by_body_part` → `body_part`
  - `by_sort_order` → `sort_order`
  - `by_updated_at` → `updated_at`

`load_type` について: 現在の器具は全てピン選択式なので、初期データは全件
`'selectorized'` とする。`'plate'`（自分でプレートを挿す形式）を選んだ種目のみ、
入力欄の下に「合計（両側）」と表示する。表示重量の意味が機種で変わるため、
数字だけ残しても後から解釈できなくなるのを防ぐ。

`weight_increment` はマシンのピンの刻みに合わせる。刻みと違う増減値だと
`+` を押しても実際に選べない重量になり、ボタンが役に立たない。
初期値は 5.0 とするが、実機で確認して設定画面から修正する前提。

### 2.2 `sessions` — トレーニング1回分

```js
{
  id: string,
  date: string,             // 'YYYY-MM-DD'（端末のローカル日付）
  started_at: number,       // エポックms
  ended_at: number | null,  // null = 進行中
  condition_note: string,   // 筋肉痛・体調など。初期値は空文字
  created_at, updated_at, deleted_at
}
```

- `keyPath`: `id`
- インデックス:
  - `by_date` → `date`（unique ではない。1日2回行く場合があるため）
  - `by_started_at` → `started_at`
  - `by_updated_at` → `updated_at`

### 2.3 `sets` — 1セット

```js
{
  id: string,
  session_id: string,
  exercise_id: string,
  order: number,          // その種目内での連番（1から）。表示には使わない
  weight: number,         // kg。0.25 刻み、0〜500
  reps: number,           // 1〜100 の整数
  note: string,           // セット単位のメモ。初期値は空文字
  recorded_at: number,    // エポックms。休憩時間の起点になる
  is_warmup: boolean,     // v1 では常に false。UI には出さない
  created_at, updated_at, deleted_at
}
```

- `keyPath`: `id`
- インデックス:
  - `by_session` → `session_id`
  - `by_exercise_recorded` → `['exercise_id', 'recorded_at']` ★最重要
  - `by_updated_at` → `updated_at`

`by_exercise_recorded` は複合インデックス。前回記録の取得がこのアプリの中核であり、
このインデックスがないと全件走査になる。必ず作ること。

`order` を表示に使わない理由: セットを削除しても振り直さないため、欠番が出る。
表示は `recorded_at` の昇順で行う。`order` は将来の同期で順序の衝突を解く材料として残す。

### 2.4 `body_weights` — 体重

```js
{
  id: string,
  date: string,               // 'YYYY-MM-DD'
  weight: number,             // kg。0.1 刻み
  body_fat: number | null,    // %。使わなければ null
  recorded_at: number,
  created_at, updated_at, deleted_at
}
```

- `keyPath`: `id`
- インデックス:
  - `by_date` → `date`（**unique: true**）
  - `by_updated_at` → `updated_at`

`by_date` を unique にする。同じ日に2件入ると推移が使えなくなるため、
DB の制約として担保する。同日入力は既存レコードの更新（upsert）として扱う。

なお、unique 制約は論理削除済みレコードにも効く。同じ日付のレコードを
論理削除した後に同じ日付で新規作成すると `ConstraintError` になるので、
削除済みレコードが見つかったら `deleted_at` を `null` に戻して再利用する。

### 2.5 `meta` — 設定と内部状態

```js
{ key: string, value: any, updated_at: number }
```

- `keyPath`: `key`（このストアのみ UUID を使わない）
- 共通フィールドの規約はこのストアには適用しない（同期対象外のため）

保持するキー:

| key | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `schema_version` | number | 1 | データの構造バージョン |
| `seeded` | boolean | false | 種目マスタの初回投入が済んだか |
| `default_rest_seconds` | number | 90 | 種目側に値がない場合の目標休憩秒数 |
| `show_body_fat` | boolean | true | 体脂肪率の入力欄を出すか |
| `persist_granted` | boolean | false | `navigator.storage.persist()` の結果 |

---

## 3. 主要なクエリ

### 3.1 前回記録の取得（最重要）

```
引数: exercise_id, current_session_id
戻り値: { session_id, date, sets: Set[] } | null
```

手順:

1. `sets` の `by_exercise_recorded` インデックスに対し、
   `IDBKeyRange.bound([exercise_id, -Infinity], [exercise_id, Infinity])` で
   `openCursor(range, 'prev')` を開く。
2. カーソルを進めながら、`deleted_at !== null` の行と
   `session_id === current_session_id` の行を飛ばす。
3. 最初に残った行の `session_id` を `target` とする。
4. `session_id === target` の行を集める。`target` 以外の `session_id` が
   出てきた時点で `cursor` を閉じて打ち切る。
5. 集めた行を `recorded_at` の昇順に並べ替えて返す。

打ち切りを忘れると記録が増えるほど遅くなる。1種目あたり読む行数は
「前回のセット数 + 今日のセット数 + 数行」に収まること。

### 3.2 進行中セッションの取得

`by_started_at` を降順にたどり、`ended_at === null && deleted_at === null` の
最初の1件。2件以上見つかった場合は最新を残し、他は
`ended_at = そのセッションの最終セットの recorded_at`（セットがなければ `started_at`）
で閉じる。アプリを強制終了した場合の復旧処理。

### 3.3 直近セッション一覧（ホーム）

`by_started_at` を降順に、`deleted_at === null` のものを5件。
各件について `by_session` でセットを引き、種目数と総ボリュームを算出する。

### 3.4 種目の直近使用順（種目ピッカー）

`sets` の `by_exercise_recorded` を種目ごとに降順で1件だけ引き、
その `recorded_at` で種目を並べ替える。種目数は十数件なので、
種目ごとに1回ずつカーソルを開いて問題ない。

### 3.5 体重の最新と前回

`by_date` を降順にたどり、`deleted_at === null` の先頭2件。

---

## 4. マイグレーション

```js
const SCHEMA_VERSION = 1;

// db.js
request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const tx = event.target.transaction;
  const from = event.oldVersion;

  if (from < 1) {
    // ストアとインデックスの作成
  }
  // if (from < 2) { ... } ← 将来追加する。既存のブロックは書き換えない
};
```

規則:

- バージョンごとに `if (from < n)` のブロックを追加していく。
- **既に出荷したブロックを書き換えない**。手元の端末には旧バージョンの
  データが入っているため、書き換えると移行が飛ばされる。
- `onupgradeneeded` の中で非同期処理（`await`、`fetch`）を待たない。
  IndexedDB のトランザクションが閉じてしまう。
  種目マスタの投入は open 完了後、通常のトランザクションで行う。

---

## 5. 種目マスタの初回投入

1. `meta.seeded` が `true` なら何もしない。
2. `false` または未設定なら `data/exercises.seed.json` を `fetch` する
   （Service Worker が precache しているのでオフラインでも読める）。
3. seed の各要素に `created_at` / `updated_at` / `deleted_at` を付けて投入する。
   seed ファイル自体にはタイムスタンプを書かない。
4. `meta.seeded = true` を書く。

seed の `id` はファイル内に固定値として書いてある。ここを実行時に生成すると、
再インストールのたびに別 ID になり、将来の同期で種目が重複する。

---

## 6. 転送形式（エクスポート / インポート）

```json
{
  "format": "gym-log-export",
  "schema_version": 1,
  "exported_at": 1757900000000,
  "app_version": "1.0.0",
  "data": {
    "exercises": [ ... ],
    "sessions": [ ... ],
    "sets": [ ... ],
    "body_weights": [ ... ],
    "meta": [ { "key": "...", "value": ... } ]
  }
}
```

- 論理削除済みレコードも含める。除外すると復元後に削除の事実が失われる。
- `meta` のうち `seeded` と `persist_granted` はインポート時に無視する
  （端末固有の状態であり、持ち込むと矛盾する）。

### インポート時の検証

以下をすべて満たさなければ、**1件も書き込まずに中断**する。

1. `format === 'gym-log-export'`
2. `schema_version === 1`
3. `data` に4つのストアのキーが存在し、いずれも配列である
4. 各レコードが `id`（UUID 形式）、`created_at`、`updated_at` を持つ
5. `sets` の `session_id` / `exercise_id` が、同じファイル内に存在する
6. `sets.weight` が 0〜500、`sets.reps` が 1〜100 の整数
7. `body_weights` の `date` に重複がない

`transfer.js` は検証と変換だけを行う純関数として書き、
IndexedDB への書き込みは `repo.js` が担当する。これによりテストできる。

---

## 7. localStorage を使わない理由

設定値の一時保存にも使わない。理由は2つ。

1. Safari の ITP は、スクリプトから書けるストレージ（IndexedDB、localStorage、
   Cache API、Service Worker 登録）をまとめて消す。ホーム画面に追加した
   Web App は対象外になるが、**どちらか一方だけ残る保証はない**。
   保存先を1つにしておけば、消えるときは全部消え、状態の不整合が起きない。
2. localStorage は同期 API なので、値が増えるとメインスレッドを止める。

---

## 8. データ量の見積もり

1セットのレコードは概ね 200 バイト。週3回 × 7種目 × 3セット = 週63セット。
年間で約 3,300 セット ≒ 660 KB。体重が年 365 件 ≒ 50 KB。

10年続けても 10 MB 未満で、iOS のオリジンあたりのクォータに対して十分小さい。
容量対策は不要。ただしブラウザ内のデータは既定では best-effort 扱いなので、
`navigator.storage.persist()` の要求と JSON エクスポートによるバックアップは必須。

## バージョン番号の役割

`db.js` の `SCHEMA_VERSION = 3` はIndexedDBのストア・インデックスと移行処理の版、バックアップJSONの `schema_version = 2` は転送形式の版です。metaの `schema_version = 2` はアプリ内データ形式（v1.1の種目フィールド）を示し、DBの構造版とは独立しています。`js/lib/version.js` の `APP_VERSION = '1.2.0'` は表示・書き出し用の製品バージョンであり、インポート可否には使いません。旧 `app_version: '1.1.0'` も引き続き読み込めます。
