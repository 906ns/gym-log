# v1.1 フェーズ0 調査（2026-09-16）

## 対象と情報源

AGENTS.md、spec.md、data-model.md、ui.mdと、提供されたfiles.zip内のv1.1.mdを読んだ。v1.1.mdはdocs/へ展開した。検索には除外指定を付け、禁止された2サイトは閲覧・引用・根拠として使用していない。以下は公式ヘルプ、WebKit、MDN、W3Cのみ。製品の機能と、本アプリに適用する判断は分けて記載する。

## 見つけた機能

| 製品 | v1.1にない機能・知見 | 出典 |
| --- | --- | --- |
| Strong | セット完了のチェックとテンプレートを中心に記録する流れ | [公式の初回ワークアウト手順](https://help.strongapp.io/article/229-my-first-workout) |
| Strong | Apple Watch、Apple Health等との連携 | [公式ヘルプの機能分類](https://help.strongapp.io/) |
| Hevy | 種目の置き換え、並べ替え、セット種別、レップ範囲 | [公式記録機能](https://www.hevyapp.com/features/track-workouts/) |
| Hevy | 身体寸法、写真、週の部位別セット数、SNS、ウィジェット | [公式機能一覧](https://www.hevyapp.com/features/) |
| FitNotes | 種目検索、セット完了チェック、距離・時間の記録、目標 | [公式Workout Tracking](https://www.fitnotesapp.com/workout_tracking/) |

## 採用する機能（1件 / 最大3件）

**種目ピッカーの名前検索**。日本語名・英語名を部分一致で絞る。既存の部位フィルタと併用し、直近使用順を維持する。フェーズ6で実装する。

この用途で効く理由: 利用者1人がピン選択式マシンの表記から種目を探せ、広告・サーバー・外部データなしで前回記録までのスクロールを減らせる。

## 採用しないもの

- セット完了チェック: このアプリは実施直後に保存するため、別の完了操作は不要。
- 種目置き換え・セッション内並べ替え: 空いている器具を選び記録順を保つ既存モデルを維持する。
- 距離・時間、身体寸法・写真: ピン式マシンで重量×レップをすぐ残す用途から外れる。
- 目標管理・部位別週セット数: 入力と判断項目を増やすため今回は追加しない。
- Apple Watch、Health、ウィジェット: 現在の静的Webアプリの範囲を超える。
- プレート・ウォームアップ計算、スーパーセット、ルーティン、RPE、ストリーク、SNS: v1.1第1節の却下を維持。却下理由を覆す根拠はない。
- 専用グラフ画面: 追加しない。ユーザーが明示した2箇所の小さなスパークラインのみ例外。

## 片手の数値入力

- FitNotesは前回値のプリフィル、数値直接入力、増減ボタンを併用する。[公式](https://www.fitnotesapp.com/workout_tracking/)
- inputmodeはキーボードへのヒントであり検証ではない。decimalはロケール依存の小数点を含むので、アプリ側の入力検証が必要。[MDN inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode)
- text入力は選択範囲を制御できる。フォーカスで全選択し、直接置き換えられるようにする。[MDN setSelectionRange](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setSelectionRange)
- このアプリへの適用: 52pxの増減、64pxの入力、重量・レップを同寸法にする。Enter保存と全選択、局所的なエラー表示。長押し400/120/60msの値は調査による最適値ではなく仕様値。
- 「この配置がジムでの片手入力に最適」と実証する一次情報が見つからない。指定寸法を実装し、390pxと実機で確認する。

## iOSのストレージとService Worker

- WebKitはサイトデータを通常オリジン単位で退避・削除する。best-effortは永続性を保証しない。Safari 17以降のStorage API、ホーム画面利用を考慮したpersistの判断が公式に説明されている。[WebKit Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- ホーム画面WebアプリはSafariのITPの7日制限とは別扱い。ただし「絶対に消えない」保証ではない。[WebKit ITP](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)
- IDBトランザクションの中でネットワーク等の非IDB非同期処理を待たない。success単体ではなくtransaction completeを保存成功とする。移行ではカーソルイベントの連鎖を使う。[MDN Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- 新SWは旧SWの制御ページが閉じるまで待機する。強制切替で新旧コードとDBの組み合わせを混在させない。App Shellを全てprecacheし、更新時に世代を上げる。[MDN Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- 適用: バックアップと永続化要求を維持。DB v1/v2からの移行を壊さず追加。v1 JSONは検証して補完し、全置換は単一トランザクション。blocked状態は画面に表示する。

## sticky と safe-area

- stickyは最も近いスクロール機構を持つ祖先に依存する。overflow:hiddenでもその祖先になり得る。下端を指定するだけでカードの境界を越えて常駐するわけではない。[MDN position](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position)
- viewport-fit=coverとenvの4辺の値を使う。安全領域は通常の余白の代用ではない。[WebKit iPhone X](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- 適用: カード祖先に不要なoverflowを付けない。入力はカード内のsticky bottom、休憩フッターの実測高さをCSS変数で渡す。safe-areaをその高さで二重計上しない。キーボードとツールバーの挙動は実機確認が必要。

## Pointer Eventsでの長押し

- pointer captureは外へ動いた後もイベントを捕捉できる。capture中の境界イベントだけには頼れない。up/cancelの後にはcaptureの解除が発生する。[W3C Pointer Events](https://www.w3.org/TR/pointerevents/)
- 適用: pointerIdを固定し、up/cancel/leave/lostpointercaptureで停止。capture中はpointermoveの座標とボタン境界も照合して外へ出たら停止。window blur、非表示、画面破棄でもタイマーを止める。複数指と右クリックは無視。clickの二重加算を抑え、キーボードclickは残す。下限・上限でタイマー終了。
- 長押し専用ボタンだけtouch-action:noneとし、ページ全体のスクロールを奪わない。タイミング計算と境界増減は純関数でテストする。

## 仕様との整合上の判断

- 現実装のDBはmeta主キー変更にバージョン2を使用済み。既存ブロックを変更しない規則と既存データ保護を優先し、今回の移行はDBバージョン3とする。meta.schema_versionとJSON形式は2。
- kgを小数4位へ丸めた後、丸めなしのkgToLbで元のlbと数学的に完全一致することは不可能。往復テストは指定の表示刻みで一致すること、および保存誤差の上限を検証する。換算定数は指定どおり。
- v1.1の「セット編集UIがなかった」は現実装と異なる。既存の編集・削除を活かし、メモを含むシートへ拡張する。
