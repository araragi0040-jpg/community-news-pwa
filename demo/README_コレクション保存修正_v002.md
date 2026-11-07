# コレクション管理 v002 — 保存修正と画像選択

## 今回の反映

**GAS・スプレッドシートの再設定や再デプロイは不要です。** v001のGASを導入済みのDEMOへ、Webファイルだけ更新してください。

`releases/news-demo-event-collection-v002-fix.zip`の`web/demo/`を、既存リポジトリの`demo/`へ重ねてアップロードします。

```text
demo/
  index.html
  app.js
  sw.js
  collection.js
  collection.css
  collection-images/
    catalog.json
```

画像フォルダを削除・置換せず、上記ファイルだけ反映してください。既存画像をZIPには含めていないため、保管済み画像はそのまま残します。公開後はPWAを閉じて再起動するか、ブラウザを再読み込みします。新しい画面には画像パスの入力欄がなく、画像選択の一覧が表示されます。

## イベント保存の修正

v001では、フォーム内の`name="id"`がブラウザの`form.id`プロパティを上書きし、送信処理の判定が失敗してページが再読み込みされる問題がありました。フォームの入力名を変更し、属性とセレクターで送信先を判定するよう修正しました。

- 保存後はコレクション管理画面に留まります。
- 保存したイベントを選択状態にして、次のカード登録欄にも引き継ぎます。
- 保存できなかった場合は入力を残し、エラーを表示します。
- 保存後の一覧再取得だけが失敗した場合は、「保存は完了しましたが」と明示します。
- 保存中の連打による多重送信を防ぎます。

参考：[HTMLFormElementの名前付き入力によるプロパティの上書き](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement)、[HTML Standard](https://html.spec.whatwg.org/multipage/forms.html#the-form-element)。

## 画像は一覧から選択

現在のGitHub Pagesでは、公開リポジトリの`demo/collection-images/`にある画像ファイルを取得し、サムネイルを表示します。

1. GitHubのフォルダで「Add file → Upload files」から、実際のPNG/JPG/WEBP/GIF画像をアップロードします。
2. 公開反映を待ちます。
3. Admin → コレクション管理 →「2. 年ごとのカード登録・編集」を開きます。
4. 「画像一覧を更新」を押し、サムネイルから画像を選びます。
5. 画像プレビューが表示されたら「カードを保存」を押します。

ファイル名だけを指定して空の`.png`ファイルを作成しても、画像にはなりません。v002ではデータが空のファイルや表示できない画像を選択できないようにしています。

画像の手動アップロード運用は維持し、管理画面からGitHubやDriveへ書き込む処理は追加していません。画像一覧の取得にアプリの認証トークンは送りません。

GitHubの一覧は既定ブランチを参照します。異なる公開ブランチを使う場合だけ、`demo/config.js`へ`COLLECTION_IMAGES_REF: "ブランチ名"`を追加してください。現在確認できた画像は`main`にあります。

GitHub APIの制限や通信エラーで一覧を取得できない場合は、静的な`catalog.json`を代わりに使います。通常のGitHub Pages運用では画像の追加ごとに一覧ファイルを更新する必要はありません。

## ローカル・GitHub以外の公開先

GitHub以外の公開先やローカルの静的配信では、画像フォルダに画像を置いた後、次を実行します。

```powershell
node demo/tools/update-collection-images.cjs
```

生成された`demo/collection-images/catalog.json`を画像と一緒にアップロードします。ZIPの`tools/`に入れたスクリプトを使う場合は、作業フォルダの`demo/tools/`へ配置してください。
既存の架空データ用プレビューサーバーはサンプル画像の一覧も返すよう更新しています。

## 検証

```powershell
node --test demo/tests/collection-client.test.cjs demo/tests/collection.test.cjs
node tests/run-analytics.cjs
```

名前付き入力がフォームIDを上書きした状態、保存成功、保存エラー、保存後の再取得エラー、連打、画像選択、空ファイル、取得失敗と再試行、QR生成・獲得を架空データで検証します。Googleの実データには接続しません。

更新後は、イベント保存時に同じ管理画面で保存メッセージが表示されること、画像を選択してカード登録→QR発行まで進めることを確認してください。
