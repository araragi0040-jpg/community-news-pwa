本番版 event_editor対応 更新内容

【反映内容】
- demo版で反映した event_editor / admin 権限分離を本番版へ反映
- admin権限なしのアカウントでは Admin タブを非表示
- event_editor / admin のみ Event タブを表示
- event_editor はイベント追加可能
- event_editor が追加したイベントは即 public で公開
- event_editor は自分が作成したイベントのみ編集・削除可能
- admin は全イベントを編集・削除可能
- イベント管理一覧で「年月指定 / 全期間」を切替可能
- 年月指定では type=month で表示年月を選択可能
- 記事・イベント通常表示と、イベント編集用取得を分離
- 過去記事挿入機能、関連記事カード、TOPガチャボタンも維持

【上書き対象】
index.html
styles.css
app.js
sw.js
config.js
manifest.webmanifest
favicon.png
logo.png
package.json

【GAS】
Code.gs も本番GASへ差し替えが必要です。
差し替え後は Apps Script の「デプロイを管理」から新しいバージョンで再デプロイしてください。

【注意】
config.js はアップロードされた本番用の内容をそのまま維持しています。
反映後、role変更済みユーザーは一度ログアウト→再ログインしてください。
Service Workerキャッシュが残る場合は、Unregister / Clear site data を実施してください。
