# ニュースdemoへの本番機能の同期

対象リポジトリ：**araragi0040-jpg/community-news-pwa**

次の本番の動作をdemoにも反映しました。

- 記事を取得したらすぐ表示し、イベントの取得完了を待ちません。
- ログイン中は30秒ごとに記事を更新します。
- ガチャから戻ったとき、タブを再表示したとき、画面にフォーカスが戻ったときに記事を即時更新します。
- 復帰時の重複した更新を抑え、既存の分析用アクセス記録も維持します。

## 反映手順

1. `releases/news-demo-refresh-update.zip`を展開します。
2. **community-news-pwa** リポジトリの次のファイルを置き換えます。
   - `demo/app.js`
   - `demo/index.html`
   - `demo/sw.js`
3. 公開反映後、demoを開き直します。PWAを起動中の場合は一度閉じて再起動してください。

demo用GAS・ガチャ・通知の接続設定はそのままです。今回の同期でGASの再デプロイは不要です。
ガチャ動画の更新は別リポジトリのため、`gacha-videos-update.zip`と`katariba_gacha/README_動画変更.md`を参照してください。

検証：`node tests/run-analytics.cjs`（demo・本番の分析機能と記事更新の動作を確認します）。
