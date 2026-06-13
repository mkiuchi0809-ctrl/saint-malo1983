# Saint Malo（サンマロー）公式サイト

東京・調布の喫茶＆ちょい呑み店「Saint Malo（サンマロー）」の縦型ランディングページ（1ページ完結）。
素のHTML / CSS / 最小限のJSで構築。SEO・MEO・AEOを同時最適化しています。

---

## ファイル構成

```
/index.html        本体（縦型LP）
/css/style.css     スタイル
/js/main.js        ハンバーガーメニュー・FAQ開閉(CSSネイティブ)・本日の営業時間表示
/images/           画像フォルダ（※現状は空。下記「要差し替え」参照）
/sitemap.xml       サイトマップ
/robots.txt        クロール許可 + sitemap参照
/README.md         本ファイル
```

---

## 各セクションと SEO/MEO/AEO 施策の対応

| セクション | 主な狙い | 対応キーワード・施策 |
|---|---|---|
| ヒーロー（h1） | 第一印象＋核となるKW | 調布駅 東口 カフェ / トアルコトラジャ 調布 / 創業1983 |
| About / 物語 | 滞在時間・E-E-A-T | 布田 喫茶店 / トアルコ・トラジャ マイスター認定店の解説 |
| こだわり（3本柱） | 商品訴求 | 調布 コーヒー 専門店 / 調布 生ビール / 調布 昼飲み |
| MENU | 検索意図への回答 | 調布 カフェ ランチ（価格は要差し替え） |
| 店内・喫煙 | 喫煙ニーズ取り込み | 調布 喫煙できる カフェ |
| アクセス | **MEO中核** | NAP統一・Googleマップ埋め込み・調布駅東口30秒・営業時間表 |
| FAQ | **AEO中核** | FAQPage構造化データ＋簡潔Q&A（AI/音声検索に引用されやすい） |
| フッター | NAP完全一致 | 店名・住所・電話をアクセス欄と1文字も違わず統一 |

### 構造化データ（JSON-LD, `<head>`内）
1. `CafeOrCoffeeShop`（LocalBusiness）— 住所・電話・営業時間・smokingAllowed・sameAs
2. `WebSite`
3. `FAQPage` — FAQ 7問

---

## 🔧【要差し替え】箇所の一覧

公開前に必ず以下を確認・差し替えてください。

### 1. メニュー（`index.html` の MENU セクション）
- ランチ・コーヒー・フード・ちょい呑みの **品目名と価格**。現在はすべて `【要差し替え】` / `¥—` のプレースホルダー。
- 架空の値は入れていません。実際のメニューに置き換えてください。

### 2. 緯度経度（GBP）
- `index.html` の `CafeOrCoffeeShop` JSON-LD 内、コメントアウトした `geo` を、
  Googleビジネスプロフィール（GBP）の正確なピン位置の緯度経度に差し替えて有効化してください。

### 3. 写真（`images/` フォルダ）
現在は全て CSS のプレースホルダー枠。以下の写真を用意し、`<img>` に差し替えると効果的です。
- **About**：店内の雰囲気がわかる横長写真
- **こだわり①**：トアルコ・トラジャ珈琲のカップ
- **こだわり②**：サッポロ生ビールのジョッキ
- **こだわり③**：ハイボール／ちょい呑みのおつまみ
- **店内・喫煙**：喫煙専用室または店内全体
- ヒーロー背景・OGPには既存画像を使用中：
  `https://cdn.amebaowndme.com/madrid-prd/madrid-web/images/sites/227382/815b16e8ae92fb728907f3703b3d023e_26e263e9b2a8f31c7af242a71d6bdaea.jpg`
  - 自社サーバーに保存し直して `images/` から配信するとさらに高速・安定します。

> 画像差し替え時の推奨：`loading="lazy"`、`width`/`height` 明示、可能なら `<picture>` でWebP対応。
> `alt` はキーワードを含む具体的な説明（例：「調布駅東口のトアルコ・トラジャ珈琲専門店サンマローの店内」）。

### 4. SNS最終URL確認
JSON-LDの `sameAs` とフッターのリンクが実アカウントと一致しているか確認してください。
- X(Twitter): https://twitter.com/gj89_tyvm
- Facebook: https://www.facebook.com/saintmalo2011
- Ameblo: https://ameblo.jp/saintmalo1983/

### 5. その他
- 喫煙・座席の詳細説明（店内セクションの `【要差し替え】`）
- アクセス効果測定用の解析タグ（GA4等）は **未設置**。導入する場合はここに記載し、`<head>` に追加してください。

---

## 🚀 公開手順（独自ドメイン www.saint-malo1983.com）

1. **全ファイルをアップロード**
   `index.html` をドキュメントルート直下に置き、`css/` `js/` `images/` のフォルダ構成を保ったままアップロード。
   `robots.txt` と `sitemap.xml` も **ドメイン直下**（ルート）に配置すること。

2. **canonical の確認**
   `index.html` の `<link rel="canonical" href="https://www.saint-malo1983.com/">` が
   実際の公開URL（www あり / https）と一致していることを確認。`www` なし等にリダイレクトを統一しておく。

3. **sitemap.xml の提出**
   Google Search Console にドメインを登録し、`https://www.saint-malo1983.com/sitemap.xml` を送信。

4. **MEO：GBPとのNAP一致確認（重要）**
   Googleビジネスプロフィール（GBP）の表記と、本サイトの NAP（店名・住所・電話）を
   **1文字も違わず**一致させること。表記ゆれ（全角/半角、ハイフン種別、ビル名有無など）は順位低下要因。
   - 本サイト表記：`Saint Malo（サンマロー）` / `〒182-0024 東京都調布市布田1-47-3` / `042-444-5994`
   - GBPの実表記に合わせて、必要なら本サイト側を最終調整してください。

5. **検証**
   - [リッチリザルトテスト](https://search.google.com/test/rich-results) で FAQPage / LocalBusiness のエラーがないか確認。
   - [PageSpeed Insights / Lighthouse](https://pagespeed.web.dev/) で Performance / SEO / Accessibility / Best Practices を確認。

---

## メモ
- 外部ライブラリ不使用（フォントのみ Google Fonts: Noto Sans JP / Shippori Mincho）。
- FAQの開閉は `<details>` のネイティブ機能でJS不要。JSが無効でも全コンテンツが読めます（プログレッシブ・エンハンスメント）。
- トラッキング・不要な外部通信は入れていません。
