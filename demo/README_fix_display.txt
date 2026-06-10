# デモ版 event_editor 表示修正版

## 修正内容

- admin権限ではないユーザーには、Adminタブを初期表示から非表示にしました。
- event_editor/admin だけに Event管理タブを表示します。
- `updateTopGachaButton` 未定義でJSが停止する可能性を修正しました。
- TOP右上ガチャボタンのクリック処理を復旧しました。
- 記事/イベントの表示用データ取得と、イベント編集用データ取得を分離しました。
  - 公開記事/公開イベントの表示を優先
  - listEditableEvents や listAllEvents が失敗しても、通常表示が止まりにくい構成に変更
- Service Worker / index / app / styles の読み込みバージョンを `event-editor-demo-2` に更新しました。

## 反映ファイル

以下を demo フォルダに上書きしてください。

- index.html
- styles.css
- app.js
- sw.js
- config.js
- manifest.webmanifest
- favicon.png
- logo.png

GAS側をまだ差し替えていない場合は `Code.gs` もApps Scriptへ反映し、新しいバージョンで再デプロイしてください。

## 注意

usersシートでroleを変更した後、既にログイン済みの端末は古いroleをlocalStorageに持っている場合があります。
一度ログアウト→再ログインしてください。
