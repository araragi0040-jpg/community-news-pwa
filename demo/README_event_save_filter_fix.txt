# デモ版：イベント保存エラー修正＋イベント管理表示期間切替

## 更新内容

### フロント側
- イベント管理の一覧に「年月指定 / 全期間」の切替を追加しました。
- 年月指定では type=month で「何年何月」を選択できます。
- 全期間では、編集可能なイベントをすべて表示します。
- event_editor / admin のrole判定を trim + 小文字化 + ハイフン/空白補正する形にして、表記ゆれで権限判定が落ちにくくしました。
- イベント保存失敗時に、FORBIDDEN系の場合は確認事項を表示するようにしました。
- イベント保存後、裏側でGASと再同期するようにしました。
- キャッシュ対策として読み込みバージョンを event-editor-demo-3 に更新しました。

### GAS側
- role判定を normalizeRoleValue() 経由に変更しました。
  - `event_editor`
  - `event-editor`
  - `event editor`
  のような表記ゆれを `event_editor` として扱いやすくしています。
- admin判定もtrim/小文字化して扱います。
- saveEvent / deleteEvent は引き続き「adminは全件、event_editorは自分が作成したイベントのみ」の判定です。

## 反映手順
1. demoフォルダに index.html / styles.css / app.js / sw.js / config.js / manifest / 画像を上書き
2. Apps Script の Code.gs を同梱の Code.gs に置き換え
3. 保存
4. Apps Script で新しいバージョンとしてデプロイ
5. 対象アカウントの users.role が `event_editor` または `admin` になっているか確認
6. role変更後は一度ログアウト→再ログイン
7. ブラウザ側で Ctrl+F5、必要であれば Service Worker Unregister / Clear site data

## イベント保存に失敗する場合の主な原因
- GASが最新版に差し替わっていない
- Webアプリを新しいバージョンで再デプロイしていない
- usersシートのroleが event_editor / admin になっていない
- role変更前のログイン情報が端末に残っている
- event_editorが他人作成イベントを編集しようとしている
