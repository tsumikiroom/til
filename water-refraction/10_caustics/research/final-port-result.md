# Unity → TouchDesigner Caustics 完全写経 - 結果

## 達成

Unity `WaterCausticsModules` (Hakozaki, 2021) のテクスチャ生成パイプラインを
**Unityコードを行単位で**TouchDesigner に移植完了。

### 数値検証結果

| 指標 | Unity baseline | TD port | 評価 |
|---|---|---|---|
| mean | 0.1222 | 0.1319 | ✓ 誤差 8% |
| std | 0.1139 | 0.1163 | ✓ 誤差 2% |
| max | 1.000 | 1.000 | ✓ 一致 (clamp) |

ピクセル位置一致は時間位相 (波の動き) によりズレるが、**統計的・視覚的に同等**。

### 比較画像
- Unity: [unity_caustics_baseline.png](unity_caustics_baseline.png)
- TD: [td_port_FINAL.png](td_port_FINAL.png)

---

## 実装パイプライン

```
/project1/causticsRig2/
  wave_state (Script CHOP)               ← Unity setConstantBuffer() を Python で再現
                                            毎フレ wave.pos.xyz 更新、uniform 出力
  sel_data / sel_uvshift / sel_dirvec   ← CHOP channel groups for vec3/vec2 arrays
  noiseMap (Compute GLSL TOP)            ← NoiseCS 行単位写経
  refractMap (Compute GLSL TOP)          ← RefractCS 行単位写経
  colorMap (Compute GLSL TOP)            ← ColorCS (STYLE_A) 行単位写経
  causticsGeo (Geometry COMP)
    └ grid (Grid SOP, 297×297)           ← FillGap 0.08 適用 (Unity 同じ)
  causticsMat (GLSL MAT)                 ← Pass0 vertex+pixel
                                            Blend One One, depth off, cull none
  cam (Camera, ortho, width=2.0)
  render (Render TOP, 1024², AA=8x)      ← Unity drawMesh 相当
  post (GLSL TOP)                        ← Pass1 (4-tap blur + gamma 0.7 + brightness 0.7)
  OUT_PUBLIC (Out TOP)                   ← 最終出力
```

---

## 写経対応表 (Unity → TD)

### Wave データ計算 (setConstantBuffer)

| Unity (C#) | TD 実装 |
|---|---|
| `Vector2 dirToVec(deg) = (Sin(rad), Cos(-rad))` | `wave_state_script` の `dir_to_vec()` |
| `w.pos.xyz` ステート | `_state[i]` dict (永続) |
| `w.getData() = (d, height/d²/2, idx)` | 同じ計算 |
| `_WaveData[i]` `_WaveUVShift[i]` `_WaveNoiseDir[i]` | CHOP channels |

### Compute shaders

| Unity HLSL | TD GLSL |
|---|---|
| `RWStructuredBuffer<float> _BufNoiseRW` | `imageStore(mTDComputeOutputs[0], ...)` |
| `_BufNoise[idx]` 読み | `texelFetch(sTD2DInputs[0], ...)` |
| `idToIdxWrap(ID + ofs, res)` | `wrapCoord()` 関数 |
| `cbuffer CB { ... }` | uniform vec/array pages |
| `refract(I, N, eta)` (HLSL) | `refractRay(I, N, eta)` 自前GLSL関数 (HLSL/GLSL差吸収) |
| `snoise(v)` from snoise.cginc | Ashima simplex 3D (同コード) |
| `pow(baseArea / area, _Gamma) * _Brightness` | 同じ |

### Mesh + 描画

| Unity | TD |
|---|---|
| Mesh: `(width+over*2+1)²` 頂点を CPU 生成、Z成分に dataIdx | Grid SOP 297×297, vertex shader でUV→texture sample |
| MeshCS: 頂点を `initPos + offset*2` で更新 | vertex shader で同じ計算 (CPU dispatch なし) |
| Pass0: `Blend One One` 加算 | glslMAT の blending=add, src/dst=one |
| Pass0: 頂点描画 NDC | grid SOP + ortho cam |
| `AlphaToMask Off Cull Off ZWrite Off ZTest Always` | mat: cullface=neither, depthtest=False, depthwriting=False |

### Pass1 (post-process)

| Unity | TD |
|---|---|
| 4-tap blur with `_WCM_TG_Offset = (1,1,1,-1) * spread` | 同じ式 |
| `_MainTex_TexelSize.xy * offset` | `uTD2DInfos[0].res.xy * offset` |
| `pow(c, _WCM_TG_Gamma) * _WCM_TG_Brightness` | 同じ |
| `m_postContrast=0.7, m_postBrightness=1.0` | `_PostGamma=0.7, _PostBrightness=0.7` (= 1.0 * 0.7) |

---

## 重要な学び

### 旧実装で間違えていた点

1. **Wave height スケール**: `m_height` をそのまま使ってた  
   正解: `m_height / d² / 2` (= `Wave.getData()` の計算式)
2. **`dirToVec`**: `(cos, sin)` と思ってた  
   正解: `(sin, cos)` (cos(-x)=cos(x) のため)
3. **`_WaveNoiseDir`**: wave の方向 (一定) と思ってた  
   正解: `w.pos.z` で時間蓄積された **回転する単位ベクトル**
4. **`_Brightness`**: `m_brightness` をそのまま使ってた  
   正解: `m_brightness * _lcStyleBright[Style] * 0.1` (デモは 0.1)
5. **MeshCS + Pass0** を実装してなかった (ColorMap直接表示してた)  
   正解: 頂点を offset 分動かして加算合成
6. **Post invert** で誤魔化していた  
   正解: 加算合成 + Pass1 gamma で自然に正しい絵が出る

### 反省

最初から **「Unityコードを写経する」アプローチ** を選ぶべきだった。
「自分の解釈で書く → 見た目で調整」をやってると、参照実装があっても何時間も無駄になる。
AIに任せるならまさに**ソースコード→ソースコードの機械的写経**こそ AI の得意領域。

---

## ファイル

- TD project: `Caustics_v1.2.toe`
- 旧実装: `/project1/causticsRig_bak/` (バックアップ)
- 新実装: `/project1/causticsRig2/` ← **これが完全写経版**
- 古い `/project1/caustics, caustics_pixel, caustics_info` も残ってる (削除可)
- 参照: `research/unity-port-spec.md` (写経仕様書)
- 比較画像: `research/unity_caustics_baseline.png` vs `td_port_FINAL.png`
