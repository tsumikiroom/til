# Unity → TouchDesigner 完全コピー仕様

Unity アセット `WaterCausticsModules` (Hakozaki) のテクスチャ生成フローを TouchDesigner に
完全コピーするための「写経仕様書」。**私の解釈は一切入れず**、Unityコードを行単位で対応させる。

参照ファイル:
- `Assets/WaterCausticsModules/WaterCausticsTexGenerator/Shaders/GenCausticsCShader.compute`
- `Assets/WaterCausticsModules/WaterCausticsTexGenerator/Shaders/GenCausticsShader.shader`
- `Assets/WaterCausticsModules/WaterCausticsTexGenerator/Shaders/snoise.cginc`
- `Assets/WaterCausticsModules/WaterCausticsTexGenerator/Scripts/WaterCausticsTexGenerator.cs`

---

## 1. 全体パイプライン (Unity の `generate()` 関数)

```
generate(deltaTime, rt):
    setConstantBuffer(cmd, deltaTime)  // 全 uniform の計算
    calcComputeShader(cmd):
        NoiseCS    → _bufNoise
        RefractCS  → _bufRefract.offset
        ColorCS    → _bufRefract.color
        MeshCS     → _bufMesh (頂点バッファ; pos+color)
    drawMesh(cmd):
        Pass0: ピクセル format target, Blend One One, AlphaToMask Off, ZWrite Off, ZTest Always, Cull Off
                頂点シェーダは appdata 直接読み (UNITY 2021.3+ では float2 vertex + float3 color)
                pixel shader: max(0, color.r).rrrr で 1ch、もしくは color.rgbg で USE_RGB
    postProcessing(cmd, dst):
        Pass1: 4-tap blur with offset multiplied by m_blurSpread
                _USE_RGB なら R/G/B 別 uv オフセット
                _BRIGHTNESS_ADJ なら pow(c, gamma) * brightness
```

---

## 2. setConstantBuffer の **全uniform値の計算式**

`setConstantBuffer()` で compute shader に渡る uniform 一覧:

### Wave データ (各 i = 0..WaveCnt-1):

```
delta = deltaTime * m_speed
overallFlow = dirToVec(m_flowDirection) * (m_flow * delta)

for each wave w:
    flowV = dirToVec(w.direction) * (w.flow * delta / m_density) + overallFlow

    w.pos.x = frac(w.pos.x - flowV.x)   // 蓄積される (state)
    w.pos.y = frac(w.pos.y - flowV.y)
    w.pos.z = frac(w.pos.z + w.fluctuation * (1/(NOISE_RADIUS*2*PI)) * delta)
              where NOISE_RADIUS = 100

    rad = w.pos.z * 2*PI
    _WaveNoiseDir[i] = vec2(cos(rad), sin(rad))   // ★ 時間で回転する方向ベクトル
    _WaveUVShift[i] = vec2(w.pos.x, w.pos.y)
    _WaveData[i] = w.getData(m_density, m_height, i)
                  = vec3(d, m_height * adjustHeight / (d*d) * 0.5, i)
                  where d = w.density * m_density

dirToVec(deg) = vec2(sin(deg*Deg2Rad), cos(-deg*Deg2Rad))
              = vec2(sin(rad), cos(rad))    // because cos(-x) = cos(x)
```

**Wave1 (density=7.3, height=0.55, fluctuation=0.85, direction=0°, flow=0.11) の実値:**
- d = 7.3
- height_scaled = 0.55 / 53.29 / 2 = **0.00516**   ← ★私の旧実装は 0.55 のままだった
- direction vector = dirToVec(0°) = vec2(0, 1)
- _WaveNoiseDir はステート w.pos.z で時間回転 (初期 0, 毎フレ +0.85*1/(200π)*delta)
- _WaveUVShift も flow で時間ずれ

**Wave2 (density=3.7, height=0.4, fluctuation=0.55, direction=100°, flow=0.20) の実値:**
- d = 3.7
- height_scaled = 0.4 / 13.69 / 2 = **0.01461**
- direction vector = dirToVec(100°) = vec2(0.9848, -0.1736)

### 解像度系:
- _CalcResUI = 256 (m_calcResolution)
- _CalcTexel = 1/256 = 0.00390625
- _CalcTexelInv = 256
- _IdxStride = 256 * 256 = 65536 (CA時のみ使用)

### Lightインスタンス:
```
lightDirection = 48°
incidentAngle = 0
litDir = Vector3.Slerp(Vector3.down, vec3(dirV.x, 0, dirV.y), incidentAngle/90)
       = Vector3.down (incident=0だから完全下向き)
       = (0, -1, 0)
litDir.y < 0 なら そのまま; >= 0 なら -0.01 にクランプ; normalize
// 座標変換: litDir = vec3(litDir.x, litDir.z, -litDir.y) = (0, 0, 1)
```
→ **_LightDir = (0, 0, 1)** (compute shaderでは z+方向に進む光)

### Brightness/Gamma/Clamp:
```
_Brightness = m_brightness * _lcStyleBright[Style.A=0] * 0.1
            = 1.0 * 1.0 * 0.1 = 0.1
_Gamma = m_gamma * _lcStyleGamma[Style.A=0]
       = 1.0 * 1.0 = 1.0
_Clamp = m_clamp = 1.0
```

### 屈折率:
```
eta = 1 / m_refractionIndex = 1/1.33 = 0.7519
chrAb = 1 + m_chromaticAberration = 1.034 (デモは off だが値はある)
_Eta = vec3(eta * chrAb, eta, eta / chrAb)   // RGB用
     = (0.7773, 0.7519, 0.7273)
```

### DrawOffset:
```
refractG = refract(litDir, eta)   // 平らな水面で eta=0.7519, litDir=(0,0,1)
                                  // 入射が真下なので refract も (0,0,0.7519) → xy=0
                                  // _DrawOffset = -(Vector2)refractG = (0, 0)
```
→ **_DrawOffset = (0, 0)** (デモでは EXTEND_RAY 無効)

---

## 3. NoiseCS の正確な処理

```hlsl
[numthreads(16, 16, 1)]
void NoiseCS(uint3 ID : SV_DispatchThreadID) {
    float2 uv = (float2)ID.xy * _CalcTexel;   // [0, 1)
    float noise = 0;
    for (uint i = 0; i < _WaveCnt; i++) {
        float2 uvE = frac(uv + _WaveUVShift[i]);   // 0..1
        float4 lc = lerpCoef(uvE);
        uvE -= 0.5;                                // -0.5..0.5
        float density = _WaveData[i].x;
        float height = _WaveData[i].y;
        float index = _WaveData[i].z;
        noise += genNoise(uvE, lc, density, _WaveNoiseDir[i], index * 20) * height;
    }
    _BufNoiseRW[idToIdx(ID.xy, _CalcResUI)] = noise;
}

genNoise(uv, lc, density, dir, shift):
    s0 = uv * density + vec2(NOISE_RADIUS=100, shift)
    s1 = s0 + density
    p0 = vec3(s0.x * dir.x, s0.y, s0.x * dir.y)
    p1 = vec3(s1.x * dir.x, s1.y, s1.x * dir.y)
    n = vec4(
        snoise(p0),
        snoise(vec3(p1.x, p0.y, p1.z)),
        snoise(vec3(p0.x, p1.y, p0.z)),
        snoise(p1)
    )
    return dot(n, lc)

lerpCoef(uv):
    e = easeInOutSine(uv)         // 0.5 - cos(PI*uv)*0.5
    adj = easeInOutSine(uv * 2)
    adj = 1 - 0.4142*0.5 + 0.4142*adj
    t = vec4(e, 1-e) * adj.xyxy
    return t.xzxz * t.yyww
```

---

## 4. RefractCS の正確な処理

```hlsl
void RefractCS(uint3 ID) {
    float3 norm = calcNormal(ID.xy);
    float3 ray = refract(_LightDir, norm, _Eta.g);
    uint idx = idToIdx(ID.xy, _CalcResUI);
    _BufRefractRW[idx].offset = calcOffset(ray);
}

calcNormal(ID):
    idx0 = idToIdx(ID, res)
    idx1 = idToIdxWrap(ID + (2, 0), res)
    idx2 = idToIdxWrap(ID + (0, 2), res)
    h0/h1/h2 = _BufNoise[idx0/1/2]
    span = _CalcTexel * 2 = 2/256 = 0.0078125
    v0 = vec3(span, 0, h1-h0)
    v1 = vec3(0, span, h2-h0)
    return -normalize(cross(v0, v1))

calcOffset(ray):
    [EXTEND_RAY off]: return ray.xy + _DrawOffset
```

注: HLSL `refract(I, N, eta)` の定義は GLSL と若干違う。HLSL は I が表面に**入る方向** (例えば下向き)、GLSL も同じ。
両者の式は同一: `eta*I - (eta*dot(N,I) + sqrt(k))*N`, ただし `k = 1 - eta²*(1 - dot(N,I)²)`。

---

## 5. ColorCS の正確な処理 (STYLE_A)

```hlsl
void ColorCS(uint3 ID) {
    uint m = _CalcResUI - 1;
    uint3 idxs;
    idxs[0] = idToIdxWrap(ID.xy + uint2(m, m), _CalcResUI);  // 左上隣接
    idxs[1] = idToIdxWrap(ID.xy + uint2(1, m), _CalcResUI);  // 右上隣接
    idxs[2] = idToIdxWrap(ID.xy + uint2(0, 1), _CalcResUI);  // 下隣接

    float col = calcColor(idxs);

    uint idx = idToIdx(ID.xy, _CalcResUI);
    _BufRefractRW[idx].color = col.rrr;
}

calcColor(idxs):
    pt[0] = _BufRefractRW[idxs[0]].offset * _CalcTexelInv
    pt[1] = _BufRefractRW[idxs[1]].offset * _CalcTexelInv + vec2(2, 0)
    pt[2] = _BufRefractRW[idxs[2]].offset * _CalcTexelInv + vec2(1, 2)

    v01 = pt[1] - pt[0]
    v02 = pt[2] - pt[0]
    area = abs(v01.x * v02.y - v02.x * v01.y)
    area = max(area, 1e-6)

    baseArea = 4.0  (STYLE_A)
    c = pow(baseArea / area, _Gamma) * _Brightness
    return min(c, _Clamp)
```

---

## 6. MeshCS の処理

Unity 側: メッシュ頂点バッファに `(pos_xy, color_rgb, initPos_xy, dataIdx_uint)` を持たせ、
MeshCS で毎フレーム `pos = initPos + offset*2` で頂点を動かし、color もコピー。

TouchDesigner では:
- **テクスチャ書き出し方式**で代用可能
  - Compute GLSL TOP `_bufMesh` (1D テクスチャ or 2D で並べる): 1 vertex = 1 pixel に (pos_xy, color_rgb)
- vertex shader 側でこの texture を sample して gl_Position と vColor を出す

詳細はメッシュ頂点数 = `(resolution + fillGap*2 + 1)² ≈ 297² = 88209` で 1D 配列で持つのが現実的。
あるいは Grid SOP の頂点に直接 texture sample させる方式 (現在の私の実装に近い) で代用。

---

## 7. Pass0 DrawCaustics

```glsl
Vertex (UNITY 2021.3+):
    in vec2 vertex (POSITION)
    in vec3 color (TEXCOORD0)
    gl_Position = vec4(vertex.xy, 0, 1)   // 既に NDC 座標
    color → varying

Pixel:
    if _USE_RGB:
        fragColor = max(0, color.rgb).rgbg   // A channel = G
    else:
        fragColor = max(0, color.r).rrrr
```

Render state:
- AlphaToMask Off
- Cull Off
- ZWrite Off
- ZTest Always
- Blend One One   ← **加算合成**
- ClearRenderTarget with Color.clear

---

## 8. Pass1 PostProcessing

```glsl
Vertex:
    o.pos = vec4(v.vertex.xy * 2 - 1, 0, 1)  // [0,1] → NDC
    if SAMPLE4:
        ofs = _MainTex_TexelSize.xyxy * _WCM_TG_Offset.xyzw
        uv0 = v.uv.xyxy + ofs.xyzw
        uv1 = v.uv.xyxy - ofs.xyzw
        uvG[0..3] = uv0.xy, uv0.zw, uv1.xy, uv1.zw
        if USE_RGB:
            ofc = _WCM_TG_OffsetColor.xy
            uvR[i] = uvG[i] - ofc
            uvB[i] = uvG[i] + ofc

Pixel:
    if USE_RGB:
        c.r = avg sample(uvR, 0)
        c.g = avg sample(uvG, 1)
        c.b = avg sample(uvB, 2)
        if BRIGHTNESS_ADJ:
            c.rgb = pow(c.rgb, gamma) * brightness
        c.a = c.g
    else:
        s = avg sample(uvG, 0)
        if BRIGHTNESS_ADJ:
            s = pow(s, gamma) * brightness
        c = s.rrrr
```

postProcessing() の loop で iteration 回繰り返し:
```
off = (iteration == 1) ? spread : 0.5 + i*spread
sampling(buf1, blitDst, offsetBaseV * off)
ping-pong buf1 / buf2
```

最終 iteration では `_BRIGHTNESS_ADJ` 有効化:
- `_WCM_TG_Gamma` = m_postContrast (linear color space なら)
- `_WCM_TG_Brightness` = m_postBrightness * m_postContrast

デモ値: m_postContrast=0.7, m_postBrightness=1.0, m_blurIterations=1, m_blurSpread=0.5
→ off = 0.5, _SAMPLE4 on, _BRIGHTNESS_ADJ on (last iteration)
→ gamma=0.7, brightness=0.7

---

## 9. 旧実装の誤り総まとめ

| 項目 | 旧誤り | 正解 |
|---|---|---|
| WaveData height | 0.55 そのまま | `0.55 / d² / 2 = 0.00516` |
| WaveNoiseDir | direction (0° → vec2(1, 0)) を固定で渡してた | `vec2(cos(rad), sin(rad))` ← rad は時間で回転 |
| dirToVec | (cos, sin) | **(sin, cos)** |
| 頂点描画 | colorMap を直接画面サンプリング | **頂点を offset 分動かして三角形を加算合成** |
| Brightness | 1.0 そのまま | **× 0.1 を掛ける** (Unity 側のスケール) |
| Post processing | invert/level で誤魔化し | 4-tap blur + gamma 0.7, brightness 0.7 |

---

## 10. TouchDesigner 実装プラン

```
/project1/causticsRig2/
  ├─ compute_noise_src (DAT)      → noiseMap (Compute GLSL TOP, 256x256 R32f)
  ├─ compute_refract_src (DAT)    → refractMap (Compute GLSL TOP, 256x256 RG32f)
  ├─ compute_color_src (DAT)      → colorMap (Compute GLSL TOP, 256x256 R32f)
  ├─ wave_uniforms_chop (CHOP)    → WaveData / WaveUVShift / WaveNoiseDir を計算 (script CHOP)
  ├─ causticsGeo (Geometry COMP)
  │   ├─ grid (Grid SOP, FillGap 対応で 297x297 or 256x256)
  │   └─ causticsMat (GLSLmulti MAT)
  │       ├─ vertex: refractMap+colorMap から offset, color を読んで pos 移動
  │       └─ pixel: vColor をそのまま出力
  ├─ cam (orthographic)
  ├─ render (Blend Add via material; bg black)
  ├─ post_blur (4-tap blur, GLSL TOP custom impl)
  └─ OUT
```

主な実装ポイント:
1. **Wave のステート蓄積** は script CHOP か Python DAT で毎フレーム update して uniform 配列に
2. **Compute shader の uniform 配列** は GLSL TOP の Arrays page で渡す (CHOP samples)
3. **頂点バッファ書き換え** は MeshCS 直接移植は難しいので、vertex shader で texture sample 方式
4. **Pass1 の 4-tap blur** は GLSL TOP に直接書く (TD の Blur TOP では Unity と同じ挙動にならない)

---

## 11. 数値検証手順

各段階で Unity の中間値と TD の中間値を比較:

1. Unity 側で `Texture2D.ReadPixels` → CSV エクスポート (Editor script)
2. TD 側で `top.sample(x, y)` → 同じ位置の値取得
3. 差分 < 0.001 で合格

検証段階:
- noiseMap (256×256 R)
- refractMap (256×256 RG)
- colorMap (256×256 R)
- 最終 RT (pre-post processing)
- 最終 RT (post processing後)
