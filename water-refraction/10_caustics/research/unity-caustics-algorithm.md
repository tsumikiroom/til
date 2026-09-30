# Unity WaterCausticsTexGenerator アルゴリズム解明

参照: `Assets/WaterCausticsModules/WaterCausticsTexGenerator/` (Masataka Hakozaki, 2021)
読み解いた現物:
- `Shaders/GenCausticsCShader.compute`
- `Shaders/GenCausticsShader.shader`
- `Shaders/snoise.cginc`（標準 Ashima simplex noise）
- `Scripts/WaterCausticsTexGenerator.cs`（デフォルト値・パラメータ範囲）

このアセットがなぜ「綺麗なコースティクス」を出せるのか、そのコアアルゴリズムを抽出する。

---

## 全体パイプライン（4段階 + 後処理）

```
[1] NoiseCS   : 多重simplex noiseで水面heightmapを生成（最大4波、UVスクロール付き）
       ↓
[2] RefractCS : heightmapから法線→refract()で光線を屈折→XY平面に投影してoffset計算
       ↓
[3] ColorCS   : 隣接3点で歪んだ三角形を作り、その面積から「光の集中度」を計算
       ↓
[4] MeshCS    : 元位置の頂点を屈折先にずらして、頂点色=明るさ で加算描画
       ↓
[Pass1] Post  : 4サンプル平均ブラー + 色収差 + γ補正
```

---

## [1] 水面 heightmap の作り方（NoiseCS）

```hlsl
float genNoise(float2 uv, float4 lc, float density, float2 dir, float shift) {
    float2 s0 = uv * density + float2(NOISE_RADIUS, shift);
    float2 s1 = s0 + density;
    float3 p0 = float3(s0.x * dir.x, s0.y, s0.x * dir.y);
    float3 p1 = float3(s1.x * dir.x, s1.y, s1.x * dir.y);
    float4 n;
    n.x = snoise(p0);
    n.y = snoise(float3(p1.x, p0.y, p1.z));
    n.z = snoise(float3(p0.x, p1.y, p0.z));
    n.w = snoise(p1);
    return dot(n, lc);
}
```

**要点:**
- 3D simplex noise を **2x2 グリッドの4点でサンプリング**し、`lerpCoef(uv)` の重み (lc) で混ぜる
  - これはタイル境界をシームレスにする為のソフトブレンディング
- **方向ベクトル `dir`** で波の進行方向をXZ平面で回転
- **shift** で波ごとに位相をずらす（時間にも乗る）
- 複数波（最大4）を足し合わせる（density/height/dir/speed が波ごとに違う）

**デフォルト2波構成:**
```csharp
new Wave(density=7.3, height=0.55, speed=0.85, flow=0.11, direction=100°),
new Wave(density=3.7, height=0.4,  speed=0.55, flow=0.2,  direction=-60°)
```
→ 細波（高周波・遅め）+ 大波（低周波・速め）の重ね合わせ

**lerpCoef（イージング）:**
```hlsl
float2 easeInOutSine_f2(float2 t) { return 0.5 - cos(PI * t) * 0.5; }
```
→ タイル境界で滑らかに切り替わる重み

---

## [2] 屈折ベクトル計算（RefractCS）

```hlsl
float3 calcNormal(uint2 ID) {
    float h0 = noise(ID);
    float h1 = noise(ID + (2,0));
    float h2 = noise(ID + (0,2));
    float3 v0 = float3(span, 0, h1 - h0);
    float3 v1 = float3(0, span, h2 - h0);
    return -normalize(cross(v0, v1));
}

float3 norm = calcNormal(ID);
float3 ray = refract(_LightDir, norm, _Eta.g);  // 屈折光線
float2 offset = ray.xy / ray.z + _DrawOffset;   // XY投影
```

- 隣接ピクセルとの高さ差から**法線**を出す
- スネルの法則で**屈折光線**を計算（`_Eta = 1/1.33 ≈ 0.752`）
- **`ray.xy / ray.z`** で水底面（XY平面）に投影 = 各ピクセルから「光がどこに届くか」のベクトル
- **色収差版** (`_CACalcSeparate`): R/G/Bそれぞれの屈折率（Etaが微妙に違う）で別offsetを計算

---

## [3] 光の集中度 = 面積の逆数（ColorCS、最重要）

```hlsl
float3x2 getPt3(uint3 idx) {
    pt[0] = _BufRefractRW[idx[0]].offset;
    pt[1] = _BufRefractRW[idx[1]].offset + (2, 0);
    pt[2] = _BufRefractRW[idx[2]].offset + (1, 2);
    return pt;
}

float calcArea(float3x2 v) {
    // STYLE_A: 三角形の符号付き面積（外積）
    float2 v01 = v[1] - v[0];
    float2 v02 = v[2] - v[0];
    return abs(v01.x * v02.y - v02.x * v01.y);
}

float calcColor(uint3 idx) {
    float baseArea = 4.0;  // 屈折なし時の基準面積
    float area = calcArea(getPt3(idx));
    return min(pow(baseArea / area, _Gamma) * _Brightness, _Clamp);
}
```

**ここがWorleyや単純Voronoiと根本的に違う点:**
- 隣接3頂点が**屈折後どこに行ったか**を計算
- それで作られる三角形の面積が**小さい = 光が一点に集中**
- 面積が大きい = 光が散らばっている
- 比 `baseArea / area` が**集中度（caustic intensity）**
- これが「キラっと一点だけ眩しい」物理的にリアルな表現の源

**STYLE_A/B/C** は面積計算方法のバリエーション:
- A: 外積（符号付き面積）— 最も鋭い
- B: distance × distance — 角丸い
- C: 三辺の積 — 最もソフト

---

## [4] メッシュ描画（MeshCS + Pass0）

```hlsl
// 各頂点を屈折先に移動
float2 newPos = initPos + dt.offset * 2;

// Pass0: Blend One One で加算描画
return max(0, i.color.r).rrrr;
```

- 元のグリッド頂点を屈折光線のオフセット分ずらす
- **頂点色=集中度** で**加算ブレンド (Blend One One)** で描く
- 多くの光線が同じ場所に集まるとピクセル値が積み上がって眩しくなる

---

## [後処理] Pass1: ポストプロセス

```hlsl
// 4タップサンプルでソフトブラー（_SAMPLE4時）
half4 ofs = _MainTex_TexelSize.xyxy * _WCM_TG_Offset.xyzw;
// → 4箇所サンプル平均

// 色収差: RGBそれぞれUVをずらしてサンプル
o.uvR[0] = uv - ofc;
o.uvG[0] = uv;
o.uvB[0] = uv + ofc;

// γ + brightness 補正
c.rgb = pow(c.rgb, _WCM_TG_Gamma) * _WCM_TG_Brightness;
```

- **4タップソフトブラー** で鋭い線を少しふんわりさせる
- **色収差** で本物の水のスペクトル分散を表現
- **γ補正** でコントラスト調整

---

## デフォルトパラメータ一覧（WaterCausticsTexGenerator.cs より）

| パラメータ | デフォルト | レンジ | 役割 |
|---|---|---|---|
| density | 1.0 | 0.1〜3.0 | 全体波密度のスケール |
| height | 1.0 | 0.0〜4.0 | 全体波高スケール |
| speed | 1.0 | 0.0〜4.0 | アニメ速度 |
| flow | 0.0 | 0.0〜1.5 | 波を流す速度 |
| flowDirection | 0° | -180°〜180° | 流す方向 |
| calcResolution | 160 | 64〜512 | 計算解像度 |
| FillGap | 0.08 | 0.0〜0.5 | 隙間埋め量 |
| refractionIndex | 1.33 | 1.0〜3.0 | 水の屈折率 |
| brightness | 1.0 | 0.0〜3.0 | 明るさ |
| gamma | 1.0 | 0.0001〜2.0 | コントラスト |
| clamp | 1.0 | 0.0〜3.0 | 上限クリップ |
| chromaticAberration | 0.005 | 0.0〜0.3 | 色収差量 |
| blurIterations | 1 | 1〜20 | ブラー反復回数 |
| blurSpread | 0.5 | 0.0〜1.0 | ブラー広がり |
| postBrightness | 1.0 | 0.0〜2.0 | 後処理明るさ |
| postContrast | 1.0 | 0.0001〜2.0 | 後処理コントラスト |

**デフォルトの2波プリセット:**
```
Wave 1: density=7.3, height=0.55, speed=0.85, flow=0.11, dir=100°
Wave 2: density=3.7, height=0.4,  speed=0.55, flow=0.2,  dir=-60°
```

---

## TouchDesigner GLSL TOP への移植戦略

**問題:** このUnityアセットは「compute + structured buffer + draw call で頂点を歪ませて加算」という方式で、**fragment shader 単体では完全には再現できない**。

**解決策（数学的等価変換）:** Evan Wallace 法 = **fragment 単体で物理的に等価なコースティクスを出す方法**

```glsl
// 各ピクセルから「自分の屈折光線がどこを照らすか」ではなく、逆に
// 「自分の所にどれだけ光線が集まってくるか」を heightmap の divergence で求める

// 1. heightmap（多重simplex noise）
float h = waterHeight(uv, time);

// 2. 法線
vec2 grad = (
    vec2(waterHeight(uv+eps.x0,t) - waterHeight(uv-eps.x0,t),
         waterHeight(uv+eps.0x,t) - waterHeight(uv-eps.0x,t))
) / (2*eps);

// 3. 屈折光線の発散（divergence）
//    = ラプラシアン ≒ 隣接5点の平均との差
float lap = (h_xp + h_xm + h_yp + h_ym - 4*h) / (eps*eps);

// 4. 集中度 = 発散の逆 = pow(saturate(-lap), gamma) * brightness
float caustic = pow(max(0, -lap * scale), gamma) * brightness;
```

これで Unity 版と**数学的に同じ物理**（光線の集中・拡散）を fragment 単体で表現できる。

**移植時のポイント:**
1. snoise は GLSL 版（Ashima）をそのまま使用
2. 多重波（デフォルト2波）を heightmap に再現
3. divergence の代わりに「屈折後位置 3点の三角形面積」を fragment 内で直接計算してもよい（より忠実）
4. ポストブラー・色収差は別パスにせず、fragment 内で 4-tap で済ます

これを次ステップで TouchDesigner GLSL TOP に実装し、`/project1/caustics_pixel` の中身を差し替える。
