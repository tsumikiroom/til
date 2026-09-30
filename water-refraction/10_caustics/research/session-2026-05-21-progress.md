# 2026-05-21 セッション記録

## 今日やったこと

### 1. Unity アセット解析（完了）
`C:\Users\kawam\OneDrive\Works\20260202_Unity-MCP\Assets\WaterCausticsModules\` を Unity MCP 経由で読み込み、コースティクスの実装を完全解析。
- 詳細: [unity-caustics-algorithm.md](unity-caustics-algorithm.md)
- 結論: **compute shader 4本 + 頂点メッシュ加算描画** の構成。fragment shader 単体では再現できない。

### 2. TouchDesigner GLSL TOP で fragment-only 再現を試行（v5〜v8 全て却下）

| バージョン | アプローチ | 却下理由 |
|---|---|---|
| v1 | Worley F2-F1 (Voronoi 距離差) | クオリティ低い、直線的 |
| v2 | Laplacian (Evan Wallace 法) | 点状のドットになり、線にならない |
| v3 | Jacobian determinant (refraction map) | 細すぎる点線状 |
| v4 | v3 + 8-tap bloom | FPS 10 まで落ちる、線が割れる |
| v5 | Domain-warped multi-octave noise | 「閉じた網目セル」にならず流体表面風 |
| v6 | Worley edge glow | 直線的すぎる、cell seed が点として可視化 |
| v7 | Worley + heavy domain warp | warp 強すぎで絡まった輪ゴム状 |
| v8 | Worley with F3 junction detection (spindle lines) | 線が密集しすぎ、参考画像と方向違い |

**学んだこと: fragment 単体では Unity の絵には到達できない。アプローチ自体を変える必要がある。**

### 3. 結論: GLSLmulti TOP + glslAdvanced POP で正しく移植する

| Unity要素 | TD 等価物 |
|---|---|
| `NoiseCS` (compute) | `glslAdvanced POP` で point attribute に heightmap を書き込む |
| `RefractCS` (compute) → offset buffer | 同上の POP で別pass、point に `offset` attribute |
| `ColorCS` (compute) → 面積→明度 | 同上、point に `color` attribute |
| `MeshCS` で頂点を offset 分動かす | POP の point position を直接更新 |
| Pass0 `Blend One One` 加算描画 | `Render TOP` + GLSLmulti material で Blend Add |
| Pass1 ポストプロセス | `Blur TOP` + `Composite TOP` |

## 現在の TouchDesigner プロジェクト状態

ファイル: `c:\Users\kawam\OneDrive\Claude-Repositories\til\water-refraction\Caustics_v1.1.toe`

`/project1` の中:
- `caustics` (GLSL TOP) — v8 シェーダーが入っている（後で破棄予定）
- `caustics_pixel` (Text DAT) — v8 GLSL コード
- `caustics_info` (Info DAT)
- `OUT` (Null TOP)
- `TouchDesignerAPI` — **絶対に触らない**（MCP サーバ）

## 夜の再開時にやること

### Phase A: 環境準備
1. `Caustics_v1.1.toe` を開く
2. Unity MCP / TouchDesigner MCP が両方接続できるか確認
3. 既存 `/project1/caustics` 系のノードは残したまま、別 COMP（例 `/project1/caustics_v9`）に新規実装

### Phase B: パイプライン構築（Unity の4ステップに 1:1 対応）

```
[Grid POP (160x160 plane)]
       ↓
[glslAdvanced POP "computeHeight"]   ← Unity NoiseCS
   - 2層 simplex noise で水面 heightmap
   - point に attribute `height` を持たせる
       ↓
[glslAdvanced POP "computeRefract"]  ← Unity RefractCS
   - 隣接point の height 差から法線 → refract() → offset
   - attribute `offset` (vec2)
       ↓
[glslAdvanced POP "computeColor"]    ← Unity ColorCS
   - 隣接3点が offset 移動後の三角形面積
   - attribute `color` = pow(baseArea / area, gamma) * brightness
       ↓
[glslAdvanced POP "applyOffset"]     ← Unity MeshCS
   - point position を offset 方向にずらす
       ↓
[Render TOP] (Blend Add ON)          ← Unity Pass0 加算描画
   - GLSLmulti TOP の material で頂点色をそのまま出力
       ↓
[Blur TOP] (light, 4-tap equivalent) ← Unity Pass1 ポストブラー
       ↓
[OUT]
```

### Phase C: 既知の罠（touchdesigner skill のメモから）

POP は新しめの機能なので学習データに古い情報が多い。実装時に気をつけるポイント:

1. **Vertex > Point > Primitive attribute class precedence**
   - mergePOP で vertex 属性が point 属性を shadow する罠
2. **boxPOP default `normal='vertNormals'`** （pointNormals ではない）
3. **facetPOP `operation='none'` (DEFAULT) は no-op** — `operation='unique'` 必須
4. **glslAdvancedPOP の `TDIndex()`** は `numthreadsmode='inputpoint'` 限定
   - `numthreadsmode='manual'` では `gl_GlobalInvocationID.x` を直接使う
5. **pointcountmode** は `['input','zero','set']` のみ（'manual' は無い）
6. **vec0type** は shader が `vec3` で使うなら 'vec3' に明示（default 'float' のまま使うと壊れる）
7. **half は GLSL の予約語** — HLSL から移植時 `half` を `float` に置換
8. **renderTOP `par.overridemat`** が dominate するので material は対応する場所で設定
9. POP の attribute は `vec0/vec1/vec2/vec3` という名前で参照（HLSL の structured buffer 構造とは違う）

### Phase D: 既存 Unity HLSL → GLSL 移植時の置換表

| HLSL | GLSL |
|---|---|
| `float3` | `vec3` |
| `float2` | `vec2` |
| `half3` | `vec3` |
| `lerp` | `mix` |
| `frac` | `fract` |
| `atan2(y,x)` | `atan(y,x)` |
| `mul(M, v)` | `M * v` |
| `RWStructuredBuffer<float>` | POP attribute (vec0valuex 等) |
| `SV_DispatchThreadID` | `gl_GlobalInvocationID` |
| `[numthreads(16,16,1)]` | `layout(local_size_x=16, local_size_y=16) in;` |

### Phase E: 参考にする Unity ソース

すべて Unity プロジェクト（`C:/Users/kawam/OneDrive/Works/20260202_Unity-MCP/Assets/WaterCausticsModules/`）に在る:

- `WaterCausticsTexGenerator/Shaders/GenCausticsCShader.compute` ★最重要
- `WaterCausticsTexGenerator/Shaders/GenCausticsShader.shader` （Pass0 = 頂点描画, Pass1 = ポスト）
- `WaterCausticsTexGenerator/Shaders/snoise.cginc` （Ashima simplex noise、GLSL 版ほぼ同じ）
- `WaterCausticsTexGenerator/Scripts/WaterCausticsTexGenerator.cs` （デフォルト値）

### Phase F: 検証

各 phase ごとに OUT TOP のサンプル値をチェック:
1. `computeHeight` 後: heightmap 値が [-1, 1] 程度に振れているか
2. `computeRefract` 後: offset が小さい値 (< 0.1) になっているか
3. `computeColor` 後: 明暗のコントラストが出ているか
4. 最終描画: 参考画像 `水池2.jpg` / `加勒比海2.jpg` と比較

参考画像:
- `C:\Users\kawam\Downloads\water caustics\水池2.jpg` （線細・暗部多・結節点フレア）
- `C:\Users\kawam\Downloads\water caustics\加勒比海2.jpg` （紡錘形の線）

## 代替案（時間が無ければ）

**Plan B: Unity でレンダリングして連番 PNG / シームレスループ動画として TD に持ち込む**
- 確実に同じ絵が出る
- 学習にはならないが、本来の目的（v2 タイポ屈折プロジェクトへの統合）には十分
- 5 秒ループの動画なら Movie File In TOP で読み込んで Displace TOP で軽く揺らせばリアルタイム合成可能

## 主要パラメータ（Unity デフォルト、TD 実装時に揃える）

| パラメータ | デフォルト |
|---|---|
| density | 1.0 |
| height | 1.0 |
| speed | 1.0 |
| Wave 1 | density=7.3, height=0.55, speed=0.85, dir=100° |
| Wave 2 | density=3.7, height=0.4, speed=0.55, dir=-60° |
| refractionIndex | 1.33 |
| brightness | 1.0 |
| gamma | 1.0 |
| clamp | 1.0 |
| calcResolution | 160 |
| FillGap | 0.08 |
| chromaticAberration | 0.005 |
| blurIterations | 1 |
| blurSpread | 0.5 |
