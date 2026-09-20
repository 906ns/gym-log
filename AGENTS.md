# AGENTS.md

このリポジトリは、個人用の筋トレ記録 PWA（gym-log）です。
実装するエージェントは、コードを書く前に本ファイルと `docs/` 配下の3つの仕様書を読んでください。

- `docs/spec.md` — 機能仕様
- `docs/data-model.md` — データモデル、IndexedDB 構成、クエリ、同期のための規約
- `docs/ui.md` — 画面仕様、デザイントークン、操作フロー

仕様と本ファイルが矛盾した場合は **本ファイルを優先**し、矛盾している箇所を報告してください。

---

## 1. プロダクトの目的

ジムでトレーニング中に、片手で、数秒で「重量 × レップ」を記録するためのアプリ。
利用者は1人（本人のみ）。他人に公開しない。広告・課金・アナリティクスは一切入れない。

最重要機能は記録そのものではなく、**種目を開いた瞬間に前回の記録が見えること**。
次のセットで何kgを扱うかの判断材料を出すことがこのアプリの存在理由であり、
この動線を遅くする変更は他のどんな利点よりも優先して却下すること。

---

## 2. 絶対に守る制約

### 禁止

- **ビルドツールの導入禁止**（Vite / webpack / esbuild / TypeScript のコンパイル等）。
  素の HTML / CSS / JavaScript (ESM) のみ。`index.html` を静的配信して動くこと。
- **フレームワーク禁止**（React / Vue / Svelte / Alpine 等）。
- **npm 依存の追加禁止**。`package.json` は `type: module` と test スクリプトのみ。
  実行時依存はゼロ。`node_modules` を必要とするコードを書かない。
- **CDN からの読み込み禁止**（スクリプト、CSS、Web フォント、アイコン一式）。
  オフラインで動かないため。フォントはシステムフォントスタックのみ。
- **外部ネットワーク通信禁止**。`fetch` の宛先は自分自身の静的ファイルのみ。
- **サーバー・認証・DB の実装禁止**。v1 は端末内で完結する。
- **`localStorage` にトレーニングデータを保存しない**（設定も原則IndexedDB）。
  例外はテーマ `gym-log-theme` のキャッシュのみ。初回描画前に外観を決めるため、
  head内の同期スクリプト1箇所だけで読み書きする。IndexedDBを正とし、テーマ以外には使わない。
- **物理削除の実装禁止**。削除は `deleted_at` を立てる論理削除のみ（例外は
  インポート時の全置換とデバッグ用の DB 削除機能）。
- 数値の丸めを伴う集計ロジックを DOM から直接呼ばない（テスト不能になる）。

### 必須

- iPhone Safari（ホーム画面に追加した standalone Web App）での動作が第一目標。
  デスクトップブラウザは開発用に動けばよい。
- オフラインで全機能が動くこと。初回読み込み後は通信なしで完結する。
- すべての破壊的操作（セッション削除、インポート、DB 初期化）に確認ダイアログを置く。

---

## 3. 配信構成

- GitHub Pages のプロジェクトサイトとして配信する。公開 URL は
  `https://906ns.github.io/gym-log/` を前提とする。
- したがって **アプリはサブパス配下で動く**。パスは必ず相対パス、または
  `new URL('./x', import.meta.url)` で解決する。ルート絶対パス（`/js/app.js` など）は
  すべてバグとして扱う。
- `manifest.webmanifest` の `start_url` と `scope` は `./` とする。
- Service Worker のスコープは `sw.js` の置き場所で決まるので、`sw.js` はリポジトリ直下に置く。
  登録は `navigator.serviceWorker.register('./sw.js')`。

---

## 4. ディレクトリ構成

この構成を変更しないこと。ファイルを増やす場合は既存の階層に従う。

```
gym-log/
├─ AGENTS.md
├─ README.md                  セットアップとホーム画面追加の手順
├─ package.json               { "type": "module", "scripts": { "test": "node --test" } }
├─ index.html                 唯一の HTML。3画面をこの中で切り替える
├─ manifest.webmanifest
├─ sw.js                      App Shell のキャッシュのみ
├─ icons/
│   ├─ icon-192.png
│   ├─ icon-512.png
│   └─ apple-touch-icon.png   180x180
├─ css/
│   ├─ style.css              画面CSS。トークンは :root に定義
│   └─ glass.css              ナビゲーションのガラス表現
├─ js/
│   ├─ app.js                 起動、画面遷移、SW 登録、永続化要求
│   ├─ db.js                  IndexedDB の open / migration / 低レベル操作
│   ├─ repo.js                ドメイン操作（db.js を使う。views からはここだけ呼ぶ）
│   ├─ views/                 画面・DOM操作
│   │   ├─ exercise-history.js
│   │   ├─ glass.js
│   │   ├─ graphics.js
│   │   ├─ history.js
│   │   ├─ home.js
│   │   ├─ liquid-glass.js
│   │   ├─ list.js
│   │   ├─ minibar.js
│   │   ├─ motion.js
│   │   ├─ pointer.js
│   │   ├─ session-history.js
│   │   ├─ session.js
│   │   ├─ settings.js
│   │   ├─ sheet-drag.js
│   │   ├─ shell.js
│   │   ├─ summary.js
│   │   ├─ theme.js
│   │   ├─ ui.js
│   │   └─ weight-control.js
│   └─ lib/                   純関数（wakelock.jsのみnavigator参照可）
│       ├─ calc.js
│       ├─ calendar.js
│       ├─ datetime.js
│       ├─ history.js
│       ├─ id.js
│       ├─ input.js
│       ├─ insights.js
│       ├─ migration.js
│       ├─ records.js
│       ├─ transfer.js
│       ├─ units.js
│       ├─ version.js
│       └─ wakelock.js
├─ test/
│   ├─ datetime.test.js
│   ├─ calc.js.test.js
│   └─ transfer.test.js
├─ data/
│   └─ exercises.seed.json    初期種目マスタ。初回起動時に投入する
└─ docs/
    ├─ spec.md
    ├─ data-model.md
    └─ ui.md
```

### レイヤーの境界（重要）

```
views/*  ──>  repo.js  ──>  db.js  ──>  IndexedDB
   │             │
   └──> lib/* <──┘         lib/* は誰にも依存しない
```

- `js/lib/` の中身は **DOM API と IndexedDB を一切参照しない**。引数を受けて値を返すだけ。
  これはテストのための制約であり、例外を作らない（`wakelock.js` のみ `navigator` を参照可）。
- `views/` から `db.js` を直接呼ばない。必ず `repo.js` を経由する。
  `updated_at` の更新漏れを防ぐため。

---

## 5. 実装順序

フェーズごとにコミットし、各フェーズの終わりに `npm test` が通る状態にすること。
フェーズを飛ばして UI を先に作らないこと。

1. **足場**: `package.json`、`index.html` の骨組み、`css/style.css` のトークン定義、
   `manifest.webmanifest`、`sw.js`、アイコン（単色の仮アイコンで可）。
   ホーム画面に追加できて画面が表示されるところまで。
2. **lib + テスト**: `id.js` / `datetime.js` / `calc.js` / `transfer.js` と、そのテスト。
   この時点で UI は空でよい。
3. **データ層**: `db.js`（ストア定義とマイグレーション）、`repo.js`、種目マスタの初回投入。
4. **セッション画面**: 記録の中核。前回記録の表示、セット入力、休憩経過時間。
5. **ホーム画面**: 体重カード、開始/再開ボタン、直近履歴。
6. **設定画面**: 種目マスタ編集、エクスポート / インポート、目標休憩秒数。
7. **仕上げ**: Wake Lock、safe-area 対応、空状態の文言、確認ダイアログ、README。

---

## 6. コーディング規約

- ESM のみ（`import` / `export`）。`var` 禁止、`const` 優先。
- セミコロンあり、インデント2スペース、シングルクォート。
- 関数名・変数名は英語。UI に出す文字列は日本語。
- **DOM 構築に `innerHTML` を使わない**。`document.createElement` と `textContent` を使う。
  ユーザーの入力したメモをそのまま描画するため、文字列連結による HTML 生成を禁止する。
- `<template>` 要素と `cloneNode` を使ってよい。
- グローバル変数を作らない。状態は各 view モジュール内に閉じる。
- エラーは握り潰さない。`catch` したら必ず画面に出すか `console.error` に出す。
  特に IndexedDB と Wake Lock の失敗は無視してよいが、無視する理由をコメントで書く。
- コメントは日本語で、**なぜそうしたか**を書く。何をしているかはコードで示す。
- 1ファイル 300 行を超えたら分割を検討する（`views/session.js` のみ 400 行まで許容）。

---

## 7. データ層の規約

詳細は `docs/data-model.md`。以下は違反したら実装をやり直す水準の規約。

1. **主キーは `crypto.randomUUID()` で生成する**。連番・自動採番を使わない。
2. **全レコードが `created_at` / `updated_at` / `deleted_at` を持つ**。
   値は UTC のエポックミリ秒（`Date.now()`）。`deleted_at` は未削除なら `null`。
3. **書き込みは必ず `repo.js` の関数経由**。`updated_at` の更新はそこで一元的に行う。
4. **読み取りは必ず `deleted_at === null` でフィルタする**。
   IndexedDB のインデックスは論理削除済みレコードも返すため、ここを忘れるとバグになる。
5. **日付は `'YYYY-MM-DD'` 形式の文字列**（端末のローカル日付）。`Date` オブジェクトを
   ストアに入れない。タイムゾーン依存のズレを避けるため。
6. スキーマ変更は `db.js` の `SCHEMA_VERSION` を上げ、`onupgradeneeded` に
   バージョン番号ごとの移行処理を追記する。既存の移行処理を書き換えない。

これらは v2 でサーバー同期を後付けするための前提です。今の段階で守っておかないと、
同期時に「どちらが新しいか判定できない」「削除したレコードが復活する」問題が発生します。

---

## 8. iOS 固有の実装要件

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
- 画面下端の固定要素には `padding-bottom: env(safe-area-inset-bottom)` を入れる。
- **すべての `input` の `font-size` は 16px 以上**。これを下回ると Safari が
  フォーカス時に自動ズームし、ジムでの入力が壊れる。
- 重量入力は `inputmode="decimal"`、レップ入力は `inputmode="numeric"`、
  どちらも `type="text"` + 自前の数値バリデーションとする。
  `type="number"` はスピナーと入力途中の値の扱いが端末で揺れるため使わない。
- ボタンに `touch-action: manipulation` を指定し、ダブルタップズームの遅延を消す。
- 操作系要素は `user-select: none`。入力欄とメモ表示は選択可のままにする。
- 初回の書き込み成功時に `navigator.storage.persist()` を呼ぶ（ユーザー操作起因の文脈で）。
  結果は設定画面に「データの保持: 許可 / 未許可」として表示する。
- Screen Wake Lock は機能検出（`'wakeLock' in navigator`）で分岐し、未対応環境では
  黙って無効にする。エラー表示もしない。
- Web Push / 通知 API は使わない（v1 のスコープ外）。

---

## 9. テスト

- `node --test` のみ。追加パッケージなし。
- 対象は `js/lib/` の純関数とApp Shellのファイル整合性。DOM と IndexedDB のテストは書かない。
- 最低限カバーすること:
  - `datetime.js`: ローカル日付キーの生成、経過秒の算出、`m:ss` 整形、日付跨ぎ。
  - `calc.js`: 推定1RM、セットのボリューム、セッション総ボリューム、前回比の差分、
    レップ1回・0回・異常値の扱い。
  - `transfer.js`: エクスポートしたものをインポートして同一になること（往復テスト）、
    壊れた JSON・バージョン違い・必須キー欠落を拒否すること。
- テストは仕様の記述として書く。`it('推定1RMは...')` のように日本語で書いてよい。

---

## 10. 完了条件

実装完了を報告する前に、以下を自分で確認すること。確認できない項目は
「未確認」と明示して報告する。推測で「動作します」と書かない。

### 自動

- [ ] `npm test` が全件パスする。
- [ ] リポジトリ内に `node_modules` への依存、CDN の URL、絶対パス（`href="/`, `src="/`）が存在しない。
- [ ] `grep -r innerHTML js/` が空である。

### 手動（静的サーバーで確認）

- [ ] `python3 -m http.server` などで配信し、サブパス配下（例: `/gym-log/`）でも動く。
- [ ] 初回起動で種目9件が投入され、設定画面に一覧表示される。
- [ ] セッションを開始し、チェストプレスに 3セット記録できる。
- [ ] 一度アプリを閉じて開き直しても記録が残っている。
- [ ] 同じ種目を翌日（端末の日付を変えて）開くと、前回のセットが上部に表示される。
- [ ] 前回記録の行をタップすると、入力欄に同じ重量とレップが入る。
- [ ] セットを記録すると、画面下端の経過時間が 0:00 から数え始める。
- [ ] 目標休憩秒数を超えると経過時間の色が変わる。
- [ ] セット行からメモを入力でき、翌日の前回記録表示にそのメモが出る。
- [ ] 体重を入力でき、同じ日に再入力すると上書きされて2件にならない。
- [ ] エクスポートした JSON をインポートすると、元の状態に戻る。
- [ ] ネットワークを切った状態で（DevTools の Offline）全画面が開き、記録できる。
- [ ] iPhone でホーム画面に追加し、アドレスバーなしで起動する。
- [ ] 入力欄にフォーカスしても画面がズームしない。

### 報告

完了報告には以下を含めること。

1. 実装したファイルの一覧と各ファイルの責務（1行ずつ）。
2. 仕様から意図的に外した点と、その理由。
3. 未確認の項目。
4. 実機（iPhone）で確認が必要な項目のリスト。

---

## 11. スコープ外（v1 では作らない）

以下は仕様書に登場しても v1 では実装しない。データモデルだけ先に用意してある。

- サーバー同期、認証、複数端末間の共有
- 専用の推移グラフ・統計画面（v1.1で採用したホームと種目履歴の小さなSVG推移線は実装済み）
- ウォームアップセットの UI（`is_warmup` カラムは作るが画面には出さない）
- 休憩終了の音・バイブ・通知
- 種目のカスタム並べ替え以外の高度な管理機能（タグ、部位の追加など）
- ダーク・ライト以外の追加テーマ（v1.2でダーク / ライト / システム追従を採用済み）

「あったほうが良い」と判断しても勝手に追加しないこと。追加したい場合は
実装せずに提案だけを報告に含める。
