# 2026-05-21 夜セッション記録

## 全体の進捗

朝に立てた POP方式を検討した結果、より実用的な **Compute GLSL TOP方式** に切替えて実装。
Unity の compute shader 4本のうち、最初の3本 (NoiseCS, RefractCS, ColorCS) を Compute GLSL TOP にポート。
最後の MeshCS + Pass0 draw call は **Grid SOP + Geometry COMP + GLSL MAT + Render TOP (additive)** で代替実装。

## 実装した TouchDesigner ネットワーク

ファイル: `c:\Users\kawam\OneDrive\Claude-Repositories\til\water-refraction\Caustics_v1.2.toe`

`/project1/causticsRig/` 配下:

```
compute_height_src (textDAT) ─→ heightMap (GLSL TOP compute, 256x256 R32f)
                                     ↓
compute_refract_src (textDAT) ─→ refractMap (GLSL TOP compute, 256x256 RG32f)
                                     ↓
compute_color_src (textDAT)  ─→ colorMap (GLSL TOP compute, 256x256 R32f)
                                     ↓
                          (sampled by vertex shader below)
                                     ↓
causticsGeo (Geometry COMP)
   ├─ grid (Grid SOP, 256x256, size 2.32 = 2 * 1.16 for FillGap=0.08)
   └─ causticsMat (GLSL MAT)
        ├─ vertex: draw_vertex_src (texture sRefract/sColor, displace + emit color)
        └─ pixel:  draw_pixel_src  (output fragColor = vColor)
                                     ↓
cam (Camera COMP, orthographic, orthowidth=2.0, tz=5.0)
                                     ↓
render (Render TOP, 1024x1024, antialias=aa8, bgcolor=black)
                                     ↓
OUT (Null TOP) → OUT_PUBLIC (Out TOP)
```

## 今までに動作確認できたこと

1. **3つの compute TOP は正しく動作**:
   - heightMap: ±0.5 程度の妥当な値
   - refractMap: ±1 程度（法線tiltに応じて）
   - colorMap: 大半は<0.01, 5-10% が >0.3 のflare, max=1.0 (clamp)

2. **Mesh 描画は正常**:
   - disp=0, vColor=const → 画面全体が均一色 ✓
   - additive blend ON でも triangle ラスタライズは機能

3. **displacement + additive で「点描」になる現象を観察中**:
   - disp=0.05 では dark 71% / dim 22% / mid 5% / bright 2%
   - 視覚的にはまだ「白いシミの集合」で参考画像の「連続した線網」になっていない

## Unity デモ実値（MCP経由で取得済み）

GameObject: `■WaterCausticsTexGen`

| パラメータ | Unity 実値 |
|---|---|
| density | 1.0 |
| height | 1.0 |
| speed | 1.0 |
| flow | 0.25 |
| flowDirection | -140° |
| **calcResolution** | **256** ← 私は最初 160 にしていた |
| **Wave 1 direction** | **0°** ← 私は 100° にしていた（修正済） |
| **Wave 2 direction** | **100°** ← 私は -60° にしていた（修正済） |
| Wave 1 (density/height/fluctuation/flow) | 7.3 / 0.55 / 0.85 / 0.11 |
| Wave 2 (density/height/fluctuation/flow) | 3.7 / 0.4 / 0.55 / 0.20 |
| FillGap | **0.08** ← 8% overhang (修正済) |
| lightDirection | 48° |
| lightIncidentAngle | 0 (= ほぼ直下) |
| brightness | 1.0 |
| gamma | 1.0 |
| clamp | 1.0 |
| refractionIndex | 1.33 |
| useChromaticAberration | false (値は 0.034 設定だが OFF) |
| usePostProcessing | **ON** |
| useBlur | **ON** |
| blurIterations | 1 |
| blurSpread | 0.5 |
| **MSAA** | **8x** ← 修正済 |
| postBrightness | 1.0 |
| postContrast | **0.7** ← 未実装 |
| chromaticAberration | OFF |

## 適用済みの修正

- ✅ calcResolution 160 → 256
- ✅ Wave directions: 私の (100°, -60°) → Unity の (0°, 100°)
- ✅ ColorMap uBrightness: 0.1 → 1.0
- ✅ Grid SOP: rows/cols 160 → 256, size 2.0 → 2.32 (8% overhang)
- ✅ Render TOP antialias: aa1 → aa8

## 休憩前の最後の数値

`disp=0.05, colorScale=1.0` で:
- dark 71% / dim 22% / mid 5% / bright 2% / flare 0%
- mean 0.075, max 1.00

## 復帰時に最初にやること

### Step 1: Unity の DEMO_WaterCausticsRT.renderTexture のスクショを撮ってもらう
- これが**目標画像**になる
- 目視で「私の現在のレンダー」と並べて比較
- 参考画像 (水池2.jpg, 加勒比海2.jpg) は **加工後** の作例で、Unity 純正の caustic 出力とはやや異なる可能性がある。Unity の生 RT が真の比較対象

### Step 2: ポストプロセスを追加

Unity の Pass1（GenCausticsShader.shader）の挙動を再現:

```
Render TOP → Blur TOP (4-tap soft) → Level TOP (postContrast=0.7) → OUT
```

具体的には:
- `Blur TOP`: par.filter='gaussian' size=2-4
- `Level TOP`: contrast par.contrast=0.7, brightness=1.0

### Step 3: 視覚的にまだ違うなら

考えうる残りの原因:
1. **drawMesh の draw call の詳細**
   - Unity は `_BufRefract` 構造化バッファを使って各頂点に offset+color データを渡す
   - 私は texture sampling で代用しているが、サンプリング座標とindex対応が完全には一致してない可能性
2. **`baseArea = 4.0` の意味**: Unityのidx[0/1/2]の幾何配置と私の幾何配置の対応
3. **`uTDMats[0].cam` vs `uTDMats[0].camProj`**: deformやprojectionの順序を再確認
4. **CalcTexel = 1/256 = 0.0039**: Unity のoffset値は `texelInv`単位で `CalcRes=256` を掛けて使っている。私はscaleを試行錯誤中

## 主要ファイル

- TD: `c:\Users\kawam\OneDrive\Claude-Repositories\til\water-refraction\Caustics_v1.2.toe`
- Unity プロジェクト: `C:\Users\kawam\OneDrive\Works\20260202_Unity-MCP\`
- Unity デモシーン: (確認時に load_scene で取得すること)
- 朝の記録: `research/session-2026-05-21-progress.md`
- アルゴリズム解説: `research/unity-caustics-algorithm.md`

## 復帰時のチェックリスト

1. [ ] TouchDesigner で `Caustics_v1.2.toe` を開く（API noteは残っている）
2. [ ] Unity プロジェクト + MCP For Unity を起動
3. [ ] Claude Code セッションで両方の MCP 接続を確認
4. [ ] `caustics_v9` や別 COMP を作りたい場合は `/project1/causticsRig` の隣に作成
5. [ ] **絶対に `/project1/TouchDesignerAPI` には触れない**
