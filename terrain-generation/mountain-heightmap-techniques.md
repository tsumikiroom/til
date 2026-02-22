# 山脈ハイトマップ生成技術

リアルタイムシェーダー（GLSL）による地形生成のための技術まとめ。
対象環境: TouchDesigner + GLSL TOP。

---

## ノイズ関数

ハイトマップ生成の基礎。グレースケール値（0.0〜1.0）が高さに対応する。

### Value Noise

格子点にランダム値を割り当て、補間する最もシンプルなノイズ。

```glsl
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep

    return mix(
        mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
        u.y
    );
}
```

| 特徴 | 内容 |
|---|---|
| 見た目 | ブロック感が残りやすい |
| 速度 | 最速 |
| 用途 | プロトタイプ、下地ノイズ |

---

### Perlin Noise

格子点に勾配ベクトルを割り当て、内積で補間する。Value Noiseより自然な見た目。

```glsl
vec2 grad(vec2 p) {
    float h = hash(p) * 6.283185;
    return vec2(cos(h), sin(h));
}

float perlinNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0); // quintic

    return mix(
        mix(dot(grad(i + vec2(0,0)), f - vec2(0,0)),
            dot(grad(i + vec2(1,0)), f - vec2(1,0)), u.x),
        mix(dot(grad(i + vec2(0,1)), f - vec2(0,1)),
            dot(grad(i + vec2(1,1)), f - vec2(1,1)), u.x),
        u.y
    );
}
```

| 特徴 | 内容 |
|---|---|
| 見た目 | 滑らかで有機的 |
| 速度 | 速い |
| 用途 | 地形の主要ノイズとして最も一般的 |

---

### Simplex Noise

Perlin Noiseの改良版。三角格子を使い計算量を削減、高次元で有利。

| Perlin との違い | |
|---|---|
| 計算コスト | 2D で約25%削減 |
| アーティファクト | 方向性バイアスが少ない |
| GLSL実装 | やや複雑 |

参考実装: [ashima/webgl-noise](https://github.com/ashima/webgl-noise)

---

### Worley Noise（Cellular Noise）

ランダムな特徴点への距離場。岩肌、水面、鱗模様に向く。

```glsl
float worley(vec2 p) {
    vec2 i = floor(p);
    float minDist = 1e9;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = i + vec2(x, y);
            vec2 point = neighbor + hash2(neighbor); // ランダム点
            minDist = min(minDist, distance(p, point));
        }
    }
    return minDist;
}
```

---

## fBm（フラクタルブラウン運動）

複数オクターブのノイズを重ね合わせて自然なフラクタル地形を生成する。
各オクターブで周波数を倍増（lacunarity）、振幅を半減（persistence）させる。

```glsl
float fbm(vec2 p) {
    float value     = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    mat2  rot       = mat2(1.6, 1.2, -1.2, 1.6); // 各オクターブで回転

    for (int i = 0; i < 8; i++) {
        value     += amplitude * noise(p * frequency);
        amplitude *= 0.5;    // persistence
        frequency *= 2.0;    // lacunarity
        p          = rot * p; // 軸揃いのアーティファクトを防ぐ
    }
    return value;
}
```

### パラメータと見た目の関係

| パラメータ | 低い値 | 高い値 |
|---|---|---|
| octaves | なだらかな大地 | 細かいディテール |
| persistence | 滑らか | ザラザラ・険しい |
| lacunarity | ゆるやかな変化 | 急峻なフラクタル |

### Ridged fBm（山脈向き）

通常の fBm を反転・折り返すことで尾根線が鋭くなり山脈らしくなる。

```glsl
float ridgedFbm(vec2 p) {
    float value     = 0.0;
    float amplitude = 0.5;
    float prev      = 1.0;

    for (int i = 0; i < 8; i++) {
        float n = 1.0 - abs(noise(p)); // 折り返し
        n        = n * n * prev;        // 前オクターブとの積で鋭さを強調
        value   += amplitude * n;
        prev     = n;
        amplitude *= 0.5;
        p        *= 2.0;
    }
    return value;
}
```

---

## 侵食（Erosion）手法

fBm で生成した地形に侵食を加えることで自然なリアリティが増す。

---

### Derivative fBm（Inigo Quilez, 2008）

勾配（微分値）を累積し、急勾配の場所でオクターブの寄与を抑制する。
追加コストほぼゼロで侵食らしい尾根・谷が自然に現れる。

```glsl
// noised(p) = vec3(height, dh/dx, dh/dy) を返す関数が必要
vec3 noised(vec2 p);

float erosiveFbm(vec2 p) {
    float a = 0.0;
    float b = 1.0;
    vec2  d = vec2(0.0); // 勾配の累積
    mat2  m = mat2(1.6, 1.2, -1.2, 1.6);

    for (int i = 0; i < 8; i++) {
        vec3 n = noised(p);
        d     += n.yz;                         // 勾配を累積
        a     += b * n.x / (1.0 + dot(d, d)); // 急勾配ほど抑制
        b     *= 0.5;
        p      = m * p;
    }
    return a;
}
```

- Shadertoy参考: https://www.shadertoy.com/view/MtGcWh
- 解説記事: https://iquilezles.org/articles/morenoise/

---

### Domain Warping

fbm の入力座標をさらに fbm で歪める。物理計算なしで侵食・流れの見た目を模倣。
1パスのシェーダーで完結し、リアルタイムに最適。

```glsl
float domainWarp(vec2 p) {
    // 1段ワーピング
    vec2 q = vec2(fbm(p + vec2(0.0, 0.0)),
                  fbm(p + vec2(5.2, 1.3)));

    // 2段ワーピング（より複雑な地形に）
    vec2 r = vec2(fbm(p + 4.0*q + vec2(1.7, 9.2)),
                  fbm(p + 4.0*q + vec2(8.3, 2.8)));

    return fbm(p + 4.0 * r);
}
```

- 解説記事: https://iquilezles.org/articles/warp/
- Shadertoy参考: https://www.shadertoy.com/view/lsl3RH

---

### Thermal Erosion（熱風化）

崩落角を超える勾配を平滑化するシミュレーション。
Feedback TOP でイテレーションを積み重ねることで自然な崩落地形になる。

```glsl
// Fragment Shader（Feedback TOPと組み合わせて毎フレーム実行）
uniform sampler2D sTD2DInputs[1]; // 前フレームのハイトマップ
uniform float tanThreshold;       // 崩落角のtan値（例: 0.5）
uniform float cellSize;

void main() {
    vec2 uv    = vUV.st;
    vec2 texel = 1.0 / uiResolution.xy;
    float h0   = texture(sTD2DInputs[0], uv).r;

    float maxDiff    = 0.0;
    vec2  bestOffset = vec2(0.0);

    // 8近傍で最急降下方向を探す
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            vec2 offset = vec2(dx, dy) * texel;
            float hn = texture(sTD2DInputs[0], uv + offset).r;
            float diff = h0 - hn;
            if (diff > maxDiff) {
                maxDiff    = diff;
                bestOffset = offset;
            }
        }
    }

    float h = h0;
    if (maxDiff / cellSize > tanThreshold) {
        h -= (maxDiff - tanThreshold * cellSize) * 0.5;
    }

    fragColor = TDOutputSwizzle(vec4(h, h, h, 1.0));
}
```

| 特徴 | |
|---|---|
| 実装難易度 | 低 |
| 見た目 | 岩の崩落・なだらかな斜面 |
| 制約 | 川筋・谷の侵食は再現しない |

---

### Shallow Water + Virtual Pipe Model（Mei et al., 2007）

物理的に最も正確な水食シミュレーション。7パス構成でTDのFeedback TOPを使って実装。

**状態テクスチャ構成**

| テクスチャ | 内容 |
|---|---|
| T1 (RGBA) | terrain_height, water_height, sediment, - |
| T2 (RGBA) | flux_L, flux_R, flux_T, flux_B |
| T3 (RG) | velocity_u, velocity_v |

**シミュレーションパス**

```
Pass 1: 降雨   water_height += rain_rate * dt
Pass 2: パイプ流量更新（重力による圧力差から計算）
Pass 3: 流量スケーリング（水量を超えないよう正規化）
Pass 4: 水面高さ更新
Pass 5: 速度ベクトル計算
Pass 6: 侵食・堆積（輸送能力 C = Kc * sin(alpha) * |v| と比較）
Pass 7: 土砂移流 + 蒸発
```

- 論文: https://inria.hal.science/inria-00402079/document
- Unity参考実装（HLSL）: https://github.com/bshishov/UnityTerrainErosionGPU

---

## 手法比較

| 手法 | 実装難易度 | パフォーマンス | 視覚品質 | TDでの方式 |
|---|---|---|---|---|
| fBm（標準） | ★☆☆☆☆ | 最高 | 中 | 1パス |
| Ridged fBm | ★☆☆☆☆ | 最高 | 中〜高 | 1パス |
| Domain Warping | ★★☆☆☆ | 高 | 中（侵食風） | 1パス |
| Derivative fBm | ★★☆☆☆ | 最高 | 中〜高 | 1パス |
| Thermal Erosion | ★★☆☆☆ | 高 | 中 | Feedback TOP |
| Shallow Water | ★★★★☆ | 中 | 最高 | Feedback TOP × 7 |

---

## 参考リンク

- [Inigo Quilez - Domain Warping](https://iquilezles.org/articles/warp/)
- [Inigo Quilez - Derivative fBm](https://iquilezles.org/articles/morenoise/)
- [Mei et al. 2007 - Fast Hydraulic Erosion Simulation on GPU](https://inria.hal.science/inria-00402079/document)
- [Jako, Toth 2011 - Fast Hydraulic and Thermal Erosion on the GPU](https://old.cescg.org/CESCG-2011/papers/TUBudapest-Jako-Balazs.pdf)
- [bshishov/UnityTerrainErosionGPU](https://github.com/bshishov/UnityTerrainErosionGPU)
- [Terrain Erosion on the GPU - aparis69](https://aparis69.github.io/public_html/posts/terrain_erosion.html)
- [Shadertoy: Erosion Simulations](https://www.shadertoy.com/view/XX2XWD)
- [ashima/webgl-noise (Simplex Noise GLSL)](https://github.com/ashima/webgl-noise)
