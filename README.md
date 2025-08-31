# Juken Boss Quest

中学受験（小5向け）と高校受験（中2向け）の算数/数学を、ボス討伐スタイルで学べるシンプルな静的Webアプリです。URLや画面上に個人名は含みません。データはブラウザのローカルストレージのみを使用します。

## 構成
- ルート設定: Vercel の Project Settings で Root Directory を `apps/boss-app` に設定
- エントリ: `apps/boss-app/index.html`
- スタイル: `apps/boss-app/styles.css`
- ロジック: `apps/boss-app/main.js`

## 主な機能
- 学年選択（小5/中2）に応じた問題バンクを自動生成
- 常にランダム出題（履歴に依存せず都度抽選）
- 正解でボスHPにダメージ、連続正解でコンボ補正
- 進捗はローカルストレージ保存（サーバ保存なし）

## ローカル起動（ビルド不要）
- Python 簡易サーバー（ポート8000）
  - Windows: `py -m http.server 8000`
  - macOS/Linux: `python3 -m http.server 8000`
  - `http://localhost:8000/apps/boss-app/` を開く
- Node http-server（ポート8080）
  - `npx http-server -p 8080`
  - `http://localhost:8080/apps/boss-app/`

## デプロイ（Vercel）
- Project Settings
  - Framework: Other
  - Root Directory: `apps/boss-app`
  - Build Command: 空
  - Output Directory: 空
- GitHub 連携: `main` へ push で Production 自動デプロイ。PR 作成で Preview が作成されます。

## アクセシビリティ
- キーボード操作: Tab/Enter/Space で操作可能（フォーカスリング可視）
- コントラスト: ボタン・テキストの視認性を確保
- 画面幅: スマホ幅で崩れないように調整

## プライバシー
- 個人や組織名を含むドメイン/表示は使用しません
- 解析・広告・外部追跡なし（純粋な静的配信）

## ライセンス
このリポジトリ内のコード/アセットの権利は所有者に帰属します。必要に応じて明示的なライセンスを追加してください。

