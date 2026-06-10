語り場ニュース デモ版 event_editor対応メモ

【このZIPで反映したこと】
- TOP右上の語り場ガチャボタンを復旧
- 過去記事挿入ボタン・関連記事カード表示を維持/復旧
- member / event_editor / admin の3権限に対応
- event_editor / admin のみ「Event管理」タブを表示
- event_editor はイベント管理画面からイベントを追加可能
- event_editor は自分が作成したイベントだけ編集対象として表示
- event_editor の保存は常に public（即公開）
- admin は全イベントを管理可能
- Service Workerのキャッシュ名と読み込みバージョンを更新

【上書き対象】
index.html
styles.css
app.js
sw.js
manifest.webmanifest
config.js
favicon.png
logo.png

【重要】
このZIPはフロント側の更新です。
「Aさんが追加したイベントはAさんだけ編集可能」というセキュリティを完全に成立させるには、GAS側でも必ず所有者チェックが必要です。
フロント側だけでボタンや一覧を隠しても、APIを直接呼ばれると編集される可能性があります。

必要なGAS側対応は GAS_event_editor_required.txt を参照してください。
