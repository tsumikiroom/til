# 四分木モザイク TouchDesigner 版（擬似四分木 GLSL, mipmap 加速）

## 概要

[../quadtree.js](../quadtree.js)（p5 段階①プロトタイプ）の GLSL ポート。リアルタイム動作（60fps前提）、入力2系統（元画像 + ノイズマスク）、ノイズで分割粒度を局所制御するハイブリッド方式。

p5版が真の再帰的四分木だったのに対し、TD版は **擬似四分木**: 2の冪サイズのブロックを (0,0) 起点グリッドに整列。各ピクセルが独立に「自分が属する最大ブロック」を判定する。フラグメントシェーダー単体で完結し60fps出る代わりに、ブロック配置が自由でなくグリッドに固定される。

**v2 (mipmap 加速)**: v1 は各ピクセルが分散計算をN×Nサンプルで毎回行っていて 271ms/frame だった。これを `prep_variance` で `vec4(R, G, B, (R²+G²+B²)/3)` の RGBA16F テクスチャを作り、mipmap chain を活用して各レベルの分散を **1 read で取得** する方式に変更。**結果: 0.06ms/frame、約4000倍速、6000fps相当**。

## ファイル

| Path | 内容 |
|---|---|
| `quadtree-mosaic.toe` | TD プロジェクト |
| `shaders/quadtree_mosaic.frag` | メインシェーダー（mipmap参照、擬似四分木判定、中点サンプリング、線描画） |
| `shaders/prep_variance.frag` | 前処理シェーダー（元画像 → 分散統計テクスチャ） |
| `Image/` | 静止画素材置き場 |
| `Movie/` | 動画素材置き場 |
| `Chan/` | CHOPデータ置き場（v1では未使用） |

## ネットワーク構造

```
moviein_source → prep_variance ─┐
                                ├─→ glsl_quadtree → out_mosaic
moviein_source ─────────────────┤
noise_mask ─────────────────────┘
```

`Quadtree` baseCOMP の中:
```
in1_main (inTOP: 元画像) ──┬─→ prep_variance ──→ glsl_quadtree (in3) ──→ out1
                          └──────────────────→ glsl_quadtree (in1)
in2_noise (inTOP: ノイズ) ────────────────────→ glsl_quadtree (in2)
```

**重要なTD固有設定:**
- `glsl_quadtree.par.inputfiltertype = mipmap` （**これがないと mipmap chain が生成されない**）
- `prep_variance.par.outputresolution = useinput`（入力の解像度・アスペクトに追従、黒帯防止）
- `prep_variance.par.format = rgba16float`（分散値の精度確保、`(R²+G²+B²)/3` を保持）
- `noise_mask.par.type = simplex3d`（GPU実装、Sparseは超重い）
- `noise_mask` は 512×512 程度で十分（マスク用途）

## パラメータ一覧

### Vectors ページ

| Uniform | 意味 | 推奨範囲 | デフォルト |
|---|---|---|---|
| `baseThreshold` | 分散しきい値の基準値。小さいほど細かい | 0.005〜0.2 | 0.04 |
| `noiseInfluence` | ノイズマスクの効き具合。0=ノイズ無視、1=完全変調 | 0〜1 | 1.0 |
| `minLevel` | 最小ブロック = 2^minLevel px | 0〜6 | 1 (=2px) |
| `maxLevel` | 最大ブロック = 2^maxLevel px | 1〜10 | 7 (=128px) |
| `varianceSamples` | (v1の名残、v2では未使用) | – | 4 (無視) |
| `showBlocks` | ブロック境界線の太さ (px)。0で線なし | 0〜10 | 0 |
| `whiteOut` | 1にするとベース画像を白にして線だけ残す | 0 or 1 | 0 |

### Colors ページ

| Uniform | 意味 | デフォルト |
|---|---|---|
| `lineColor` | 境界線の色 (RGB)。TDの色ピッカーで指定 | (0,0,0) 黒 |

### ハイブリッド判定式

```
threshLocal = baseThreshold * mix(1, max(0, 1 - noise), noiseInfluence)
分散 > threshLocal なら分割する
```

例:
- `baseThreshold=0.04, noiseInfluence=1, noise=0` → `threshLocal=0.04`（大ブロック寄り）
- `baseThreshold=0.04, noiseInfluence=1, noise=1` → `threshLocal=0`（minLevel まで強制細分割）
- `baseThreshold=0.04, noiseInfluence=0, noise=任意` → `threshLocal=0.04`（ノイズ無視）

### 線描画モード

`showBlocks > 0` で四分木構造の境界線が描かれる。`whiteOut=1` と組み合わせると **線画だけ抽出** できる。これは四分木構造そのものを可視化する用途に強力。

## 使い方

1. `quadtree-mosaic.toe` を開く
2. `moviein_source.par.file` に画像か動画を指定（`Image/` または `Movie/` から）
3. `glsl_quadtree` の Vectors ページで各 uniform を調整
4. ビューワで結果確認

## 検証手順

### Test 1: ノイズ一定 0.5（基本ロジック確認）

`noise_mask` を一時的に Constant TOP (r=g=b=0.5) に差し替え:
- `threshLocal = 0.04 * (1 - 0.5) = 0.02`
- 全画面で一様な閾値の四分木モザイク。p5版相当の見た目

### Test 2: 水平ランプノイズ（ノイズ→閾値変調の確認）

`noise_mask` を Ramp TOP (左→右で 0→1) に差し替え:
- **左粗 → 右細のグラデーション**が出る
- これが本実装のハイブリッド性の核心

### Test 3: showBlocks デバッグ

`showBlocks=1.0, lineColor=(0,0,0), whiteOut=1`:
- 黒い線のみの線画。fine/coarse の境界で 2:1 ステップが見える（真の四分木構造）

### Test 4: 線アート

`showBlocks=2.0, lineColor=(1,0,0), whiteOut=1`:
- 白背景に赤線の幾何学パターン

## パフォーマンス

| ノード | cookTime | 備考 |
|---|---|---|
| `noise_mask` (Simplex3D 512×512) | 0.05ms | アニメーション中 |
| `prep_variance` | 0.05ms | 静止画なら再cookしない |
| `glsl_quadtree` (1080×1920) | 0.06ms | 全パラメータ更新時 |
| **合計** | **~0.2ms** | 5000fps相当の余裕 |

実際の cap は **vsync 60fps**。

### v1 との比較

| 項目 | v1 (毎ピクセル N×N サンプリング) | v2 (mipmap) |
|---|---|---|
| 2048×2048 cookTime | 271ms | 0.06ms |
| 想定 fps | 2-3 | 60+ (vsync 制限) |
| シェーダー読込数/pixel | 7 levels × 16 samples = 112 | 7 levels × 1 = 7 |

## アルゴリズム

```text
PER PIXEL:
  for L in [maxLevel .. minLevel+1]:
    block_size      = 2^L
    block_origin    = floor(pixelCoord / block_size) * block_size
    block_center    = block_origin + block_size/2
    noise           = sample noise_mask at block_center
    threshold_local = baseThreshold * (1 - noise * noiseInfluence)

    # mipmap level L のRGBA = (mean(R), mean(G), mean(B), mean((R²+G²+B²)/3))
    stats     = textureLod(prep_variance, block_center, L)
    variance  = stats.a - dot(stats.rgb, stats.rgb) / 3

    if variance > threshold_local:
      chosen_level = L - 1   # 分割する → 1段細かい
    else:
      chosen_level = L       # ここで停止
      break

  midColor = source[block_center_of(2^chosen_level)]
  baseColor = whiteOut ? white : midColor
  if showBlocks > 0 and pixel near block edge within showBlocks pixels:
    output = lineColor
  else:
    output = baseColor
```

詳細は [`shaders/quadtree_mosaic.frag`](shaders/quadtree_mosaic.frag) と [`shaders/prep_variance.frag`](shaders/prep_variance.frag) のコメント参照。

## 既知の制限（v1スコープ外）

1. **グリッド整列**: ブロックは (0,0) 起点の2の冪グリッドに固定。真の自由配置四分木とは異なる
2. **時間的安定性なし**: 各フレーム独立判定。ノイズが速く動くとブロック境界がチラつく → ゆっくりしたノイズ推奨
3. **分散判定のみ**: Sobel/彩度などの代替基準は v2
4. **中点サンプリングのみ**: 平均モード / median-of-N は v3
5. **正方ブロック**: 縦横サイズ等しい正方形のみ

## TD で踏んだ罠（次回のため）

1. **`uniform sampler2D sTD2DInputs[N]` を再宣言してはダメ**: TDが組み込みで宣言済み。再宣言すると入力サンプラが上書きされて意味不明な値が出る
2. **scalar uniform は Vectors ページ経由で vec4 として渡す**: `Constants` ページは GLSL `#define` 相当でリアルタイム変更不可
3. **`int uniform` の Type 指定は機能しない (TD仕様)**: float uniform で受けて `int(uniform.x)` でキャストするのが安全
4. **mipmap 生成は `consumer.inputfiltertype = mipmap`**: 生成側 (`prep_variance.filtertype`) ではなく**消費側**で指定して初めて chain が作られる
5. **`outputresolution = custom + 1024×1024`** にすると非正方形入力が黒帯付きで詰められる: `useinput` が正解
6. **`TOP.sample()` の `.a` は嘘**: シェーダー内 `.a` は正しく書けていても `TOP.sample().a` は `.r` 値を返す（TD固有の sampling 慣習）。検証は downstream シェーダーで読んで確認
7. **Sparse Noise は超重い** (821ms/cook): GPU実装の Simplex3D に変える
8. **Sequence par の numBlocks は `op.seq.X.numBlocks = N`**: `op.par.X = N` は無効（sequence count は parm sequence object 経由）

## 参考

- [../quadtree.js](../quadtree.js) — p5 版アルゴリズム
- [../README.md](../README.md) — p5 版 README
- Scrapbox: [/tsumikiroom-idea/四分木・八分木を使ったモザイク表現](https://scrapbox.io/tsumikiroom-idea/)
- TD公式: [Write a GLSL TOP](https://docs.derivative.ca/Write_a_GLSL_TOP), [Mipmapping](https://docs.derivative.ca/Mipmapping)
