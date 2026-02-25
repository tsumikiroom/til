# p5.js

## 概要

p5.js は Processing の精神を継承した JavaScript ライブラリ。「すべての人のためのコーディング（Coding for All）」を掲げ、アーティスト・デザイナー・教育者・初心者がブラウザ上でインタラクティブなビジュアルやアニメーションを手軽に作成できることを目的に設計されている。

HTML5 Canvas を描画先として使用し、図形描画・アニメーション・インタラクション・音・カメラなど多彩な機能を直感的な API で提供する。Processing Foundation が管理するオープンソースプロジェクト。

### 歴史・背景

| 年 | 出来事 |
|---|---|
| 2001年 | Ben Fry と Casey Reas が Processing（Java ベース）を開発開始 |
| 2007年 | John Resig が Processing.js を開発（Processing コードを JS に変換するトランスパイラ） |
| 2013年 | Lauren Lee McCarthy が p5.js を開発開始（JS の再解釈として構想） |
| 2014年 | Processing Foundation が設立、p5.js が正式なプロジェクトに |
| 2025年4月 | p5.js 2.0 リリース（Web Editor でオプトイン開始） |

> p5.js は Processing.js とは別物。Processing.js が「Java の Processing コードを変換する」ツールだったのに対し、p5.js は JavaScript をネイティブな言語として Processing の思想を再解釈した独立した実装。

### 主な思想・特徴

- **多様性と包摂（Diversity & Inclusion）**: 女性・有色人種の表現が不足している分野の課題を最初から解決する姿勢
- **Friendly Error System**: 初心者に優しいエラーメッセージ
- **アクセシビリティ**: スクリーンリーダー対応
- **多言語ドキュメント翻訳**
- **Web Editor**: インストール不要で始められる環境

---

## 環境構築

### CDN を使う方法（最もシンプル）

```html
<!DOCTYPE html>
<html>
  <head>
    <script src="https://cdn.jsdelivr.net/npm/p5@2.2.0/lib/p5.js"></script>
  </head>
  <body>
    <script src="sketch.js"></script>
  </body>
</html>
```

### npm でインストール（ビルドツールと組み合わせる場合）

```bash
npm install p5
```

```javascript
import p5 from 'p5';

const sketch = (p) => {
  p.setup = () => {
    p.createCanvas(400, 400);
  };
  p.draw = () => {
    p.background(220);
    p.ellipse(200, 200, 80, 80);
  };
};

new p5(sketch);
```

### p5.js Web Editor

[https://editor.p5js.org/](https://editor.p5js.org/) にアクセスするだけで利用可能。

- インストール不要
- スケッチの保存・共有・リミックスができる
- アカウント作成は無料
- 初心者・教育現場に最適

### VS Code での開発

1. 拡張機能 [p5.vscode](https://marketplace.visualstudio.com/items?itemName=samplavigne.p5-vscode) をインストール
2. コマンドパレットから「Create p5.js Project」でプロジェクト生成
3. Live Server 拡張でリアルタイムプレビュー

### 基本のコード構造

```javascript
function setup() {
  createCanvas(400, 400);  // 起動時に1回だけ実行
}

function draw() {
  background(220);          // デフォルト60fps で繰り返し実行
  circle(mouseX, mouseY, 50); // マウス位置に円を描画
}
```

| 関数・変数 | 説明 |
|---|---|
| `setup()` | 起動時に1回だけ実行される初期化処理 |
| `draw()` | 毎フレーム呼ばれるメインループ（デフォルト 60fps） |
| `mouseX / mouseY` | マウスの現在座標 |
| `keyPressed()` | キー押下イベントハンドラ |

---

## 利用事例・使われ方

### ジェネラティブアート / NFT

- **Art Blocks**（Ethereum ベースのジェネラティブアート NFT プラットフォーム）で多くの作品が p5.js で制作されている。Tyler Hobbs の「Fidenza」が代表例。
- **fxhash**（Tezos ベース）でも主要な制作ツール。zancan の「Garden, Monoliths」、William Mapan の「Dragons」などが著名。

### 教育

- **The Coding Train**（Daniel Shiffman / NYU）: YouTube 登録者数 約200万人。p5.js を使ったクリエイティブコーディングチュートリアルを多数公開。著書「The Nature of Code」も p5.js ベース。
- UCLA、NYU ITP をはじめ世界の多くの大学でカリキュラムに採用。

### インタラクティブアート

マウス・キーボード・タッチ・マイク・カメラ入力を組み合わせたインタラクティブな Web 作品制作が得意。ギャラリーの Web サイトやデジタルインスタレーションで広く使われている。

### データビジュアライゼーション

CSV・センサーデータのリアルタイムビジュアライズや、教育的なデータビジュアライゼーションの入門ツールとして活用されている。

### 著名なユーザー

| 名前 | 役割 |
|---|---|
| Lauren Lee McCarthy | p5.js 創設者、UCLA 教授 |
| Daniel Shiffman | NYU ITP 教授、The Coding Train |
| Tyler Hobbs | ジェネラティブアーティスト（Fidenza） |
| zancan | ジェネラティブアーティスト（Garden, Monoliths） |
| William Mapan | ジェネラティブアーティスト（Dragons） |

---

## 他ライブラリとの比較

### p5.js vs Three.js

| 観点 | p5.js | Three.js |
|---|---|---|
| 対象ユーザー | 初心者・アーティスト | 開発者・エンジニア |
| 描画次元 | 主に 2D（3D も可） | 3D 特化（WebGL） |
| 学習コスト | 低 | 高 |
| パフォーマンス | 中程度 | 高い |
| ユースケース | クリエイティブコーディング・教育 | 3D ゲーム・WebXR・製品ビジュアル |

Three.js は月次でリビジョンが更新され API が変わることがあり、古いサンプルが動かないことも多い。

### p5.js vs PixiJS

| 観点 | p5.js | PixiJS |
|---|---|---|
| 描画エンジン | Canvas 2D（+ WebGL） | WebGL（Canvas フォールバックあり） |
| パフォーマンス | 中程度 | 非常に高い（大量スプライト処理が得意） |
| 学習コスト | 低 | 中程度 |
| ユースケース | アート・プロトタイプ | ブラウザゲーム・広告・大量オブジェクト描画 |

### p5.js vs Paper.js

| 観点 | p5.js | Paper.js |
|---|---|---|
| グラフィクスモデル | 即時モード（Immediate mode） | 保持モード（Retained mode / シーングラフ） |
| ベクター操作 | 基本的な図形のみ | 高度なパス操作・ブール演算 |
| コミュニティ規模 | 非常に大きい | 小さい |
| ユースケース | アート・教育・プロトタイプ | SVG 操作・精密なベクターグラフィクス |

### p5.js vs D3.js

| 観点 | p5.js | D3.js |
|---|---|---|
| 描画基盤 | Canvas | SVG（主） |
| データバインディング | なし（手動） | 強力なデータバインド機構 |
| 学習コスト | 低 | 高（D3 独自のパラダイム） |
| ユースケース | アーティスティックなビジュアル | データ分析・統計グラフ・インフォグラフィクス |

### p5.js vs Processing（Java 版）

| 観点 | p5.js | Processing |
|---|---|---|
| 言語 | JavaScript | Java |
| 実行環境 | ブラウザ | デスクトップ（JVM） |
| 配布・共有 | URL で即座に共有 | 実行ファイルのビルドが必要 |
| パフォーマンス | 低め | 高い（JIT コンパイル） |
| Web との連携 | 容易 | 困難 |
| ユースケース | Web ベースの作品・教育 | 高速処理・スタンドアロンアプリ |

### まとめ比較

| ライブラリ | 強み | 学習コスト | 典型的なユースケース |
|---|---|---|---|
| **p5.js** | 初心者向け・教育・クリエイティブ | 低 | アート・教育・ジェネラティブ |
| **Three.js** | 3D・WebGL・高品質レンダリング | 高 | 3D ゲーム・WebXR・製品ビジュアル |
| **PixiJS** | 2D 高速描画 | 中 | ブラウザゲーム・広告・大量スプライト |
| **Paper.js** | ベクター精度・パス演算 | 中 | SVG 操作・ベクターアプリ |
| **D3.js** | データバインド・統計グラフ | 高 | データ分析・インフォグラフィクス |
| **Processing** | パフォーマンス・スタンドアロン | 中 | デスクトップアート・ピクセル処理 |

---

## 最新動向（2025年）

p5.js 2.0 が 2025年4月にリリース（1.x は 2026年3月までサポート継続、Web Editor のデフォルトは 2026年8月より 2.0 に移行予定）。

主な新機能：

- **可変フォント（Variable Fonts）対応**: フォントのウェイト・幅・スラントをアニメーション可能。`textToContours()` / `textToPoints()` 関数（3.5倍高速化）
- **JavaScript シェーダー**: GLSL を書かずに JavaScript で GPU シェーダーを記述可能。`strokeShader()` などで塗り・線・画像にシェーダーを適用できる
- **拡張カラースペース**: LAB、LCH、OKLab、OKLCH、Display P3（HDR）対応
- **非同期ファイル読み込み**: `async/await` パターンに移行

---

## 参考リンク

- [p5.js 公式サイト](https://p5js.org/)
- [p5.js Web Editor](https://editor.p5js.org/)
- [The Coding Train](https://thecodingtrain.com/)
- [p5.js GitHub](https://github.com/processing/p5.js)
- [p5.js 2.0 リリースノート](https://medium.com/processing-foundation/p5-js-2-0-you-are-here-f827f40519a7)
