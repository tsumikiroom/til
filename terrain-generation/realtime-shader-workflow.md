# リアルタイムシェーダー地形ジェネレーター 実装ワークフロー

TouchDesigner + GLSL TOP を使った山脈ハイトマップジェネレーターの実装ステップ。

---

## 前提環境

- TouchDesigner 2022以降（Compute Shader サポートのため）
- GLSL の基礎知識（vec型、swizzle、texture sampling）
- 対象成果物: リアルタイム更新される山脈ハイトマップ → 3D地形レンダリング

---

## Phase 1 — GLSL 基礎

**目標**: TouchDesignerでGLSL TOPを動かし、UVベースの描画に慣れる。

### ステップ

1. **GLSL TOPの基本構造を把握する**
   - `vUV.st` でUV座標（0.0〜1.0）を取得
   - `fragColor = TDOutputSwizzle(vec4(...))` で出力
   - `uResolution` で解像度取得

2. **基本的な数学関数を試す**
   ```glsl
   out vec4 fragColor;
   void main() {
       vec2 uv = vUV.st;
       float v = smoothstep(0.3, 0.7, uv.x);
       fragColor = TDOutputSwizzle(vec4(v, v, v, 1.0));
   }
   ```

3. **グラデーション・チェッカーパターンを作る**
   - `fract`, `floor`, `mod` の動作確認
   - UVスケーリング（`uv * 10.0` など）

### チェックポイント
- [ ] GLSL TOPでグレースケール出力できる
- [ ] UV座標の操作ができる
- [ ] `smoothstep` の動作を理解している

---

## Phase 2 — ノイズ関数の実装

**目標**: ノイズ関数をGLSLで実装し、グレースケールのノイズテクスチャを出力する。

### ステップ

1. **ハッシュ関数を実装する**
   ```glsl
   float hash(vec2 p) {
       return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
   }
   ```

2. **Value Noiseを実装する**（最初はこれから）
   - 格子点のハッシュ値を補間
   - `mix` + `smoothstep` の組み合わせ

3. **Perlin Noiseに発展させる**
   - 勾配ベクトルと内積の概念を理解
   - Quintic補間（6t⁵-15t⁴+10t³）を使う

4. **ノイズ出力をハイトマップとして確認する**
   - グレースケール（白=高い、黒=低い）として出力

### チェックポイント
- [ ] ハッシュ関数が実装できる
- [ ] Value Noiseが動く
- [ ] Perlin Noiseが動く
- [ ] ノイズがタイリングなく表示される

---

## Phase 3 — fBm の実装

**目標**: fBmを実装し、山脈らしいシルエットを出力する。

### ステップ

1. **標準 fBm を実装する**
   - 8オクターブ、persistence=0.5、lacunarity=2.0
   - 各オクターブで回転行列を適用（アーティファクト防止）

2. **Ridged fBm に派生させる**
   - `abs()` → 反転で尾根が鋭くなる
   - 前オクターブの積で鋭さを強調

3. **パラメータをUniform化する**
   - `uniform float uOctaves`
   - `uniform float uPersistence`
   - `uniform float uLacunarity`
   - `uniform float uScale`

4. **ハイトマップをGeometry COMPに接続して3D確認**
   - Heightfield SOP または Displacement MAT で立体化

### チェックポイント
- [ ] 8オクターブのfBmが動く
- [ ] Ridged fBmで山脈シルエットが出る
- [ ] Uniformでリアルタイムパラメータ制御できる
- [ ] 3D立体として確認できる

---

## Phase 4 — 侵食風エフェクト（1パス完結）

**目標**: シミュレーションなしで侵食らしい見た目を実現する。

### ステップ

1. **Derivative fBm を実装する（推奨・先にやる）**
   - `noised(p)` = `vec3(height, dh/dx, dh/dy)` を返す関数を作る
   - 勾配を累積し、急勾配でオクターブを抑制する係数を加える
   - 参考: https://iquilezles.org/articles/morenoise/

2. **Domain Warping を実装する**
   - 1段: `fbm(p + offset * fbm(p))`
   - 2段: さらにネストして複雑な歪みを加える
   - 参考: https://iquilezles.org/articles/warp/

3. **2手法を組み合わせる**
   - Derivative fBm で基本地形を作る
   - Domain Warping で流れの方向性を加える

### チェックポイント
- [ ] `noised()` が正しく勾配を返せる
- [ ] Derivative fBm で尾根・谷のコントラストが増している
- [ ] Domain Warping で川・谷筋の流れが見える

---

## Phase 5 — Thermal Erosion シミュレーション

**目標**: Feedback TOPを使ったイテレーティブなシミュレーションを実装する。

### TDネットワーク構成

```
[Noise TOP] → 初期ハイトマップ
    ↓
[Switch TOP] ─── 初回はNoise TOP, 2フレーム目以降はFeedback TOP
    ↓
[GLSL TOP] ─── Thermal Erosionシェーダー
    ↓
[Feedback TOP] ─── 前フレームを参照して戻す
```

### ステップ

1. **Feedback TOPの仕組みを理解する**
   - 初回フレームに初期テクスチャを入力する Switch TOP のロジック
   - `sTD2DInputs[0]` で前フレームを参照

2. **Thermal Erosionシェーダーを実装する**
   - 8近傍の勾配計算
   - 崩落角を超えた場合に高さを移動
   - `tanThreshold` をUniform化

3. **収束を確認する**
   - 数百〜数千フレームで崩落地形が安定する
   - イテレーション数をパラメータ化（毎フレーム複数ステップ）

4. **fBm地形 → Thermal Erosion のパイプラインを繋ぐ**
   - Phase 3の出力をThermal Erosionの初期値として使う

### チェックポイント
- [ ] Feedback TOPループが正しく動く
- [ ] フレームを重ねるごとに地形が変化する
- [ ] 崩落後の地形が自然に見える
- [ ] fBm + Thermal Erosion のパイプラインが動く

---

## Phase 6 — Shallow Water シミュレーション（発展）

**目標**: 物理的に正確な水食シミュレーションを実装する。

### TDネットワーク構成（7パス）

```
T1 (terrain, water, sediment) ──┐
T2 (flux LRTB)                  ├── GLSL TOP Pass 1〜7 → Feedback TOPs
T3 (velocity uv)               ──┘
```

### ステップ

1. **3枚の状態テクスチャを設計する**
   - T1: RGBA32F（terrain_height, water_height, sediment, unused）
   - T2: RGBA32F（flux_L, flux_R, flux_T, flux_B）
   - T3: RG32F（velocity_u, velocity_v）

2. **各パスを順番に実装する**
   - Pass 1: 降雨加算
   - Pass 2-3: パイプ流量の更新と正規化
   - Pass 4: 水面高さの更新
   - Pass 5: 速度ベクトルの計算
   - Pass 6: 侵食・堆積
   - Pass 7: 土砂の移流 + 蒸発

3. **参考実装のHLSLをGLSLに移植する**
   - 参考: https://github.com/bshishov/UnityTerrainErosionGPU

4. **パラメータを調整する**
   - `Kc`: 輸送能力係数
   - `Ks`: 侵食速度
   - `Kd`: 堆積速度
   - `Ke`: 蒸発速度
   - `rain_rate`: 降雨量

### チェックポイント
- [ ] 7パスのFeedbackループが正しく動く
- [ ] 水が低地に流れ込む様子が見える
- [ ] 地形が徐々に侵食されていく
- [ ] 扇状地・谷筋が形成される

---

## Phase 7 — シェーディングと出力

**目標**: 生成したハイトマップをリアルタイムで美しくレンダリングする。

### ステップ

1. **法線マップを生成する**
   ```glsl
   // ハイトマップから法線を計算
   float hL = texture(heightmap, uv - vec2(texel, 0.0)).r;
   float hR = texture(heightmap, uv + vec2(texel, 0.0)).r;
   float hD = texture(heightmap, uv - vec2(0.0, texel)).r;
   float hU = texture(heightmap, uv + vec2(0.0, texel)).r;
   vec3 normal = normalize(vec3(hL - hR, 2.0 * texel, hD - hU));
   ```

2. **高度別カラーマッピングを実装する**
   - 雪（高度 > 0.8）: 白
   - 岩（0.6〜0.8）: グレー
   - 草（0.3〜0.6）: 緑
   - 砂（0.1〜0.3）: ベージュ
   - 水（< 0.1）: 青

3. **Diffuseライティングを加える**
   - 法線マップとライト方向の内積でシェーディング
   - アンビエント + ディフューズ

4. **フォグ・大気効果を加える**
   - 距離に応じたフォグ
   - 水平線の霞み

### チェックポイント
- [ ] 法線マップが正しく生成される
- [ ] 高度別カラーマッピングが動く
- [ ] ライティングで立体感が出る
- [ ] 全体的にリアルな山脈に見える

---

## 推奨実装順（最短ルート）

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 7
```

Phase 5, 6 はシミュレーションの理解が深まってから取り組む。
Phase 4（Derivative fBm + Domain Warping）だけで視覚的に十分な品質が出せる。

---

## 参考リンク

- [TouchDesigner GLSL TOP Documentation](https://docs.derivative.ca/GLSL_TOP)
- [Inigo Quilez - Articles](https://iquilezles.org/articles/)
- [The Book of Shaders](https://thebookofshaders.com/)
- [Shadertoy](https://www.shadertoy.com/)
- 技術詳細: [mountain-heightmap-techniques.md](./mountain-heightmap-techniques.md)
