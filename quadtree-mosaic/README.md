# 四分木モザイク（中点サンプリング版）

## 概要

画像を四分木で再帰分割し、各リーフを **中点ピクセルの色** で塗るブラウザ完結のp5.jsスケッチ。Michael Foglemanの[`quads`](https://github.com/fogleman/Quads)は「平均色」「優先度キューでN回分割」だが、本実装はユーザー本人のアイデア（[Scrapbox: 四分木・八分木を使ったモザイク表現](https://scrapbox.io/tsumikiroom-idea/)）に従い「中点色」「閾値ベース再帰分割」を採用している。

中点サンプリングの効果: コントラストの強い領域（目・髪・布の繊維）で微細構造が均されずに残るため、平均色よりも「シャープで生っぽい」モザイクになる。代わりに平坦な領域（空・壁）では中点がたまたまノイズを拾い、スペックル状の色斑が出る。これは仕様。

最終的にはTouchDesignerでリアルタイム実装することが目標だが、本プロトタイプは段階①「静止画 × 四分木 × 中点サンプリング」の最小検証版。

## ファイル

| Path | 内容 |
|---|---|
| `index.html` | p5.js 2.x をCDNロードする最小シェル |
| `sketch.js` | p5の配線、UI、ドラッグ&ドロップ、描画 |
| `quadtree.js` | 純粋アルゴリズムモジュール（p5非依存、入出力固定） |
| `samples/portrait.jpg` | 初期表示用のサンプル画像（任意で配置） |

## 使い方

1. VS Codeで本フォルダを開き、`index.html` を **Live Server** または `npx serve` で配信する
   - `file://` 直開きはダメ。canvasの`pixels`読み取りがCORSでブロックされる
2. ブラウザで開くと、`samples/portrait.jpg` があれば初期表示。無ければ「画像をドロップしてください」と表示
3. 任意の画像をキャンバスへドロップ、またはコントロール右の「画像を選択」から指定
4. スライダーを動かしてパラメータを調整
   - スライダー操作は **即時反映されない**。値を変えたら **Re-process** ボタンを押す（1MP級の画像でも操作感を保つため）
5. `Save PNG` で結果を書き出す

## パラメータ

| Param | Default | Range | 用途 |
|---|---|---|---|
| `threshold` | 400 | 0–4000 | 分散メトリックのしきい値。大きいほど粗いモザイク |
| `minLeaf` | 4 | 2–64 | 最小リーフ辺(px)。1pxリーフを防ぐ |
| `maxLeaf` | 256 | 32–1024 | 最大リーフ辺(px)。平坦画像でも必ず構造が出るよう強制分割 |
| `varianceSampleStride` | 2 | 1–8 | 分散計算時のピクセル間引き（perf調整） |
| `samplesPerLeaf` | 1 | – | v2予定（median-of-N）。v1ではUIのみで無効 |
| `show borders` | off | – | リーフ境界線を描画（デバッグ用） |

`threshold` のデフォルト400は「チャンネル毎の標準偏差20 ≒ 20² = 400」を「ノイズと構造の境界」と見なした目安値。画像によって最適値は大きく変わるので必ず触る。

## アルゴリズム

```text
function build(image, region, params):
  if region.w > maxLeaf or region.h > maxLeaf:
    shouldSplit = True   # 必ず分割
  elif region.w <= minLeaf or region.h <= minLeaf:
    shouldSplit = False  # これ以上分割しない
  else:
    metric = varianceMetric(region)  # RGB各チャンネル分散の平均
    shouldSplit = metric > threshold

  if not shouldSplit:
    return [{...region, color: midpointColor(region)}]
  # 4等分して再帰
  ...
```

分散メトリック:

```
var = E[X²] - E[X]²  をRGB各チャンネルで計算し、3チャンネル平均
```

1パスで計算するため `sum`, `sum²` の累積だけで済む。`varianceSampleStride` で間引き可能。

中点サンプリング:

```
cx = floor(region.x + region.w / 2)
cy = floor(region.y + region.h / 2)
color = image.pixels[cy * width + cx]
```

`samplesPerLeaf > 1` のパスは関数シグネチャだけ用意してあり、v2でmedian-of-Nを実装する足場になる。

### Fogleman方式との比較

| | 本実装（閾値ベース再帰） | Fogleman `quads`（貪欲予算） |
|---|---|---|
| 終了条件 | 領域の分散が閾値以下、またはminLeaf到達 | N回分割で停止 |
| 出力リーフ数 | 画像内容に依存 | 常にN+1 |
| メンタルモデル | 「変化が大きいところを再帰」 | 「最も誤差の大きいリーフをN回」 |
| 状態 | スタックのみ | 優先度キューが必要 |
| サンプリング | 中点 | 平均 |

両者は別物のアルゴリズム。本実装はScrapboxに書かれたユーザー本人のメンタルモデルを優先。

## トレードオフ

中点サンプリングは「リーフ中心1pxの素の色」を出すので、肌・髪・布など微細構造のあるところでは均されない生っぽさが残る。一方、空・壁などの平坦領域では中点がたまたまノイズやJPEGアーティファクトを拾うと、変な色のブロックが点在しやすい（スペックル）。

これは仕様であり、本プロトタイプの観察対象でもある。v1では `samplesPerLeaf=1` 固定で「最大スペックル状態」を体験するのが目的。v2で median-of-N を入れると、ディテール領域のシャープさを維持したまま平坦領域のスペックルだけ抑えられるはず。

## 検証（スモークテスト）

3種類の入力画像でそれぞれ以下のような結果になれば正しく動いている。

1. **ポートレート**（顔・肌・無地背景）
   - 背景と額・頬は大ブロック
   - 目・鼻・髪・唇の境界は細かいブロック
   - 中点サンプリングなら **目のあたりは瞳の暗色と白目の明色がパキッと隣り合う**（平均色ならグレーに均される）

2. **単色画像**（グレー一枚PNG）
   - 分散ゼロ → `maxLeaf` 制約だけが効く
   - 結果は `maxLeaf` サイズの均一なグリッド
   - これ以上分割されていたら分散計算かサンプリングのバグ

3. **高周波テクスチャ**（砂利・葉群）
   - 全域で `minLeaf` まで再帰
   - **中点サンプリング由来のスペックル感** が顕著に出る

実行ごとに `console.log({leafCount, minDepth, maxDepth, runMs})` を出力するので、ブラウザのDevToolsで数値も確認できる。

## 次のステップ

- **段階②（p5.jsのまま拡張）**
  - median-of-N 中点サンプリング（`samplesPerLeaf > 1` のスタブを実装）
  - 複数の分割基準（輝度エッジ、彩度、Sobel）をトグル
  - Fogleman風の貪欲予算モードもトグル可能に
  - リーフ配列を JSON でエクスポート
- **段階③（TouchDesigner移植）**
  - JSONまたはDATテーブルでリーフ配列をTDに渡す
  - Geometry COMP + instanced rects / POP でモザイク描画
  - **時間的安定性が中心課題** になるので、フレーム間で四分木構造を保持しヒステリシス付きで差分更新する設計が必要

## 参考

- [Michael Fogleman - quads (Quadtree Image)](https://github.com/fogleman/Quads)
- Scrapbox: [/tsumikiroom-idea/四分木・八分木を使ったモザイク表現](https://scrapbox.io/tsumikiroom-idea/)
- Scrapbox: [/tsumikiroom/四分木（Quadtree）](https://scrapbox.io/tsumikiroom/)
- 本リポジトリ: [`creative-coding/p5js.md`](../creative-coding/p5js.md) — p5.js 2.x の基本
