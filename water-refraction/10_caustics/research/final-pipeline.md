# Caustics Pipeline (TouchDesigner) — Final Working Version

## 成果物

Unity アセット **WaterCausticsModules (Masataka Hakozaki, 2021)** のコースティクス生成を
TouchDesigner で動作するパイプラインに移植。Unity の純正 RenderTexture と
視覚的に同等の出力を達成。

### ビフォー / アフター

| | |
|---|---|
| **Unity 純正 baseline** | [unity_caustics_baseline.png](unity_caustics_baseline.png) |
| **TouchDesigner 移植版** | [td_v11_final.png](td_v11_final.png) |

両者とも「白背景に薄いグレーの網目線」のシグネチャを持つ caustic 模様。
TD 移植版は GPU compute shader (GLSL TOP compute mode) を3段使い、
最後に post-blur + invert + level でルックを Unity 形式に合わせる構成。

## ネットワーク構成

`/project1/causticsRig/` 配下：

```
[compute_height_src DAT] ─→ [heightMap GLSL TOP compute, 256x256 R32f]
                                    │
                                    ▼
[compute_refract_src DAT] ─→ [refractMap GLSL TOP compute, 256x256 RG32f]
                                    │
                                    ▼
[compute_color_src DAT] ─→ [colorMap GLSL TOP compute, 256x256 R32f]
                                    │
                                    ▼
                            [post_blur (Blur TOP)]
                                    │
                                    ▼
                       [post_invert (Level TOP, invert=1)]
                                    │
                                    ▼
            [post_level (Level TOP, outlow/outhigh で薄める)]
                                    │
                                    ▼
                            [OUT_PUBLIC (Out TOP)]
```

注: `causticsGeo` + `causticsMat` (mesh + GLSLmulti material + 加算ブレンド)
の経路は当初 Unity の頂点ベース描画を真似て作ったが、最終的には不要となった。
**colorMap 自体が既に正しい網目構造を出している** ため、メッシュ描画段階を
スキップして直接 ColorMap → post 処理だけで Unity 同等のルックが得られる。
（geometry chain は残してあるが OUT_PUBLIC からは切り離し済み）

## 最終パラメータ (v12, 自動探索で決定)

| ノード | パラメータ | 値 |
|---|---|---|
| heightMap | uDensity | **0.5** |
| heightMap | uHeight | 1.0 |
| heightMap | uSpeed | 1.0 |
| refractMap | uEta | 0.7519 (= 1/1.33) |
| refractMap | uLightDirZ | -1.0 |
| refractMap | uExtendRay | 0.0 |
| colorMap | uBrightness | **0.7** |
| colorMap | uGamma | 1.0 |
| colorMap | uClamp | 1.0 |
| post_blur | size | **16** (pixels, at 1024 res) |
| post_blur | outputresolution | custom 1024x1024 |
| post_blur | filtertype | linear |
| OUT_PUBLIC | input | post_blur (invert/level chain は使わず) |

### 決定プロセス（自動探索）

1. **発見**: Unity baseline は black bg + dim white lines（私が以前見た「白背景」は Read tool が自動でレベル補正していただけ）
2. パラメータ空間 4 (density) × 3 (blur) × 3 (brightness) = 36 variants を自動cook + 保存
3. Unity baseline と比較: 統計量 (mean/std/edge density) で score 化
4. 視覚目視: top score とは別に `d=0.5 blur=16 br=0.7` が最も人間目線で似ていると判定
   - 数値的なRMSEは位相ズレに敏感で当てにならないため、最終判断は目視
5. 視覚採用: 結節点フレア + 連続曲線 + Unity同等セル数

### 過去の試行 (削除済み):
- v3〜v11: `post_invert + post_level` で「白背景に薄いグレー線」風に変換していた
  → 実は Unity の生 RT も黒背景なので invert 不要だった

**主要な気づき:**
- `uDensity=0.45` で Unity baseline と同じセル数（~45個）に揃う
  - 当初 1.0 でセル数が約3倍多すぎた
  - Unity 内では `density=1.0` だが、私のシェーダーは座標スケール解釈が違うため 0.45 が等価
- `post_level` の `outlow=0.5, outhigh=0.98` で「黒い線→薄いグレー線」に変換
  - これにより Unity 純正の「淡い」見た目に揃う

## 各 compute shader の役割

### heightMap (Step 1: 水面 heightmap)
- Ashima simplex noise 3D を 2波重ね
  - Wave 1: density 7.3 (×uDensity), dir 0°, height 0.55
  - Wave 2: density 3.7 (×uDensity), dir 100°, height 0.4
- 出力: R32f テクスチャに heightmap 値 (±0.5 程度)
- ソース: [compute_height_src DAT in toe]

### refractMap (Step 2: 屈折光線 offset)
- heightMap の隣接2点との差から法線を計算
- スネルの法則で光線屈折 → XY平面に投影
- 出力: RG32f テクスチャ (offset.x, offset.y) (±1 程度)

### colorMap (Step 3: 集中度＝明度)
- 隣接3頂点を refractMap で動かして三角形を作る
- 三角形の面積の逆数 = 光の集中度
- 面積が小さいほど明るい = caustic ridge
- 出力: R32f テクスチャ (caustic intensity 0〜1)

## post 処理

### post_blur (size=1.0)
- ColorMap の細かいエイリアシングを軽くソフト化

### post_invert (Level invert=1)
- caustic は本来「黒背景 + 白い線」だが、Unity は逆に「白背景 + 暗い線」で出力する
- これに合わせるため invert を入れる

### post_level (outlow=0.5, outhigh=0.98)
- invert 後の image を [0, 1] → [0.5, 0.98] の範囲にマッピング
- これで黒い線（=元の白い caustic ridge）が薄いグレー (~0.5) に
- 背景（=元の黒い領域）がほぼ白 (~0.98) に
- 結果として Unity 純正と同じ「淡い白背景に薄いグレー網目」になる

## 既知の差異

| 項目 | Unity | TD |
|---|---|---|
| セルの形 | 角張った多角形 | わずかに丸い（gaussian blur 由来） |
| 線のシャープネス | やや高い | わずかに soft |
| セル数 | ~45 | ~50-60 |

実用上は許容範囲。完全一致を求めるなら:
- `post_blur` を box filter に変える
- compute_height の noise scaling を再調整

## 復帰 / 改造ポイント

- パラメータ調整は `heightMap.par.vec1valuex` (Density) と `post_blur.par.size` が
  最も視覚に効く
- 動画/アニメーション化したい場合は `heightMap` の `uTime` uniform に
  `absTime.seconds` 式が既に入っているので自動で動く
- v2 (タイポ屈折プロジェクト) に統合する場合、`OUT_PUBLIC` を別 COMP の入力に渡せばOK

## ファイル

- TD プロジェクト: `Caustics_v1.2.toe`
- 比較画像:
  - `research/unity_caustics_baseline.png` (Unity 純正)
  - `research/td_v11_final.png` (移植版)
  - その他 `td_v3〜v10_*.png` (試行錯誤の履歴)
