# 語り場ニュース 本番反映用ファイル

このZIPは、最新demo版のPush通知実装を本番用設定に差し替えたものです。

## 反映先
GitHub Pages 本番:
https://araragi0040-jpg.github.io/community-news-pwa/

Vercel Push API 本番:
https://community-news-pwa.vercel.app/api/push/send

## 反映するファイル
- index.html
- app.js
- config.js
- styles.css
- sw.js
- manifest.webmanifest
- favicon.png
- logo.png
- package.json
- api/push/send.js

## 本番 config.js
GAS_API_URL: https://script.google.com/macros/s/AKfycbzyL-rkQTcM_GijeBRHFZT3vfsv58xkQIZFAI6PPPC8IFQ50OB62DJrriiWjOLMyZAE/exec
GACHA_APP_URL: https://araragi0040-jpg.github.io/katariba_gacha/
PUSH_SEND_API_URL: https://community-news-pwa.vercel.app/api/push/send
MODE: prod

## Vercel環境変数で確認するもの
- GAS_API_URL = https://script.google.com/macros/s/AKfycbzyL-rkQTcM_GijeBRHFZT3vfsv58xkQIZFAI6PPPC8IFQ50OB62DJrriiWjOLMyZAE/exec
- PUSH_WEBHOOK_SECRET = 本番GASのPUSH_WEBHOOK_SECRETと同じ値
- WEB_PUSH_SUBJECT = mailto:メールアドレス
- WEB_PUSH_VAPID_PUBLIC_KEY = config.js の PUSH_VAPID_PUBLIC_KEY と同じ値
- WEB_PUSH_VAPID_PRIVATE_KEY = 上記Public KeyとペアのPrivate Key

## GASプロパティで確認するもの
- APP_BASE_URL = https://araragi0040-jpg.github.io/community-news-pwa/
- PUSH_WEBHOOK_URL = https://community-news-pwa.vercel.app/api/push/send
- PUSH_WEBHOOK_SECRET = VercelのPUSH_WEBHOOK_SECRETと同じ値

## 反映後の確認
1. 本番URLを開き、DevTools Consoleで SW registered / SW ready が出るか確認
2. 通知許可後、PushSubscriptionsシートにendpointが追加されるか確認
3. Vercel APIへテスト送信して sentCount が1以上になるか確認
4. 本番管理画面から新規記事を投稿し、端末に通知が来るか確認
