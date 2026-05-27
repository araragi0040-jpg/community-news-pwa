# Push通知修正版（demo用）

この一式は demo 側だけを更新する前提のファイルです。本番環境用の `config(6).js` / v48 系ファイルは触っていません。

## 反映先

- GitHub Pages / demo: `index.html`, `app.js`, `sw.js`, `config.js`, `styles.css`, `manifest.webmanifest`, `favicon.png`, `logo.png`
- Vercel Push API: `send.js`, `package.json`

## 主な修正

1. 通知許可を自動実行で出さず、ユーザー操作の `#btnNotify` から許可・購読するように変更。
2. PWAインストール済み（standalone）でも通知有効化ボタンが表示されるように変更。
3. VAPID公開鍵が変わった場合、古い購読を解除して再購読するように変更。
4. service worker / cache / query version を v50 に更新。
5. Vercel の push 送信APIに OPTIONS/CORS と購読形式チェックを追加。

## Vercel 環境変数

- `WEB_PUSH_SUBJECT` 例: `mailto:your@example.com`
- `WEB_PUSH_VAPID_PUBLIC_KEY` ※ `config.js` の `PUSH_VAPID_PUBLIC_KEY` と同じ値
- `WEB_PUSH_VAPID_PRIVATE_KEY` ※上記公開鍵とペアの秘密鍵
- `PUSH_WEBHOOK_SECRET` ※GAS 側から送る secret と同じ値
- `PUSH_ALLOWED_ORIGIN` 任意。未設定なら `*`

## 確認手順

1. demo を開いてログイン。
2. ベルアイコンを押して通知を許可。
3. DevTools Console で `navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription()).then(console.log)` を実行し、endpoint が出ることを確認。
4. GAS 側の `savePushSubscription` に保存されていることを確認。
5. Vercel の `/api/push/send` に保存済み subscription を渡して `sent: 1` になるか確認。
