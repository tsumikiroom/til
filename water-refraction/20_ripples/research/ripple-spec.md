# Ripple — 実装仕様書

## 概要

指定位置から発生する水面波紋を **Shadertoy procedural 方式** で実装。
複数の波紋が同時に存在し、 線形加算により**干渉縞**を表現する。

参考: [Shadertoy ripple水面シェーダ (Schlick bias 利用)](http://dept-info.labri.fr/~schlick/DOC/gem2.ps.gz)

## アーキテクチャ

```
/project1/rippleRig (baseCOMP)
│
├── param_chop          (parameterCHOP)    ← Custom Pars を CHOP として exposeして cook 連鎖トリガ
├── cook_drv            (constantCHOP)     ← absTime.frame を流して毎フレ cook 強制
├── trigger_panel       (containerCOMP)    ← マウスクリック検知 (OUT_PUBLIC を表示)
├── click_exec          (panelExecuteDAT)  ← 'select' callback で rig.store に ripple 追加
│
├── ripples_list        (scriptCHOP)       ← rig storage から alive な ripple を毎フレ取り出す
│                                            channels: u, v, strength, age
├── ripples_list_script (textDAT)          ← ripples_list の onCook
│
├── ripples_packed      (scriptCHOP)       ← 4 channels x N samples の vec4 array 形式に整形
├── ripples_packed_script (textDAT)
│
├── ripple_render       (Compute GLSL TOP) ← Shadertoy 方式で全 ripple を sum
├── ripple_render_src   (textDAT)
│
├── post                (GLSL TOP, pixel)  ← height/normal/edge + gamma/brightness
├── post_pixel_src      (textDAT)
│
└── OUT_PUBLIC          (Out TOP)
```

## アルゴリズム (per-ripple)

Shadertoy 由来の per-ripple リング展開:

```glsl
float age = R.w;
vec2 d = uv - R.xy;
float dist = pow(dot(d, d), 0.7);           // shaped radial distance

float x = dist * _Frequency;                 // ring frequency scaling
float ringFront = _Wavespeed * age * 2.0*PI; // expanding ring front

if (x > ringFront) continue;                 // 波がまだ届いてない

float e = max(1.0 - age/_Lifetime, 0.0);     // 時間経過でフェード
float F = e * x / ringFront;                  // leading edge 強調

float s = sin(x - ringFront - PI*0.5);        // ring oscillation
s = s*0.5 + 0.5;                              // 0..1
s = bias(s, _Biasshape);                      // Schlick bias で profile shaping
s = (F * s) / (x + 1.1);

h += s * R.z;  // R.z = strength
```

干渉は `h` への線形加算で出る。

## マウスクリック → 波紋発生

`trigger_panel` (containerCOMP) は `OUT_PUBLIC` を表示。
`click_exec` (panelExecuteDAT) が `onOffToOn` の `select` で callback 発火:

```python
u = float(panel.panel.u)
v = float(panel.panel.v)
ripples = rig.fetch('ripples_data', [])
ripples.append({
    'u': u, 'v': v,
    'strength': float(rig.par.Strength),
    'spawnTime': absTime.seconds,
    'lifetime': float(rig.par.Lifetime),
})
rig.store('ripples_data', ripples)
```

## 毎フレ cook の仕組み

Script CHOPは **入力が無いと downstream pull がない限り cook されない**問題があったので:
- `cook_drv` (constantCHOP) を `ripples_list` の input に接続
- `cook_drv.par.value0.expr = 'absTime.frame'` で毎フレ値変化
- これで cook 連鎖: cook_drv → ripples_list → ripples_packed → ripple_render → post

## Custom Parameters

### Simulation ページ
| Param | Default | Range | 役割 |
|---|---|---|---|
| Strength | 1.0 | 0-10 | クリック1回の振幅 |
| Lifetime | 3.0s | 0.1-30 | 波紋の寿命 (秒) |
| Frequency | 60.0 | 1-500 | リング周波数 (細かさ) |
| Wavespeed | 1.5 | 0-20 | 波の広がる速度 |
| Biasshape | 0.6 | 0.01-0.99 | Schlick bias で波形の鋭さ |
| Maxripples | 32 | 1-128 | 同時 alive な波紋の最大数 |

### Display ページ
| Param | Default | Range | 役割 |
|---|---|---|---|
| Calcresolution | 512 | 64-4096 | シミュレーション解像度 |
| Outputresolution | 1024 | 128-8192 | 出力解像度 |
| Postcontrast | 1.0 | 0.0001-10 | 後処理ガンマ |
| Postbrightness | 1.0 | 0-10 | 後処理明るさ |
| Visualize | height | height/normal/edge | 出力モード |

### Trigger ページ (将来用)
| Param | Default | 役割 |
|---|---|---|
| Triggerchop | (空) | パーティクル等からの位置リスト |
| Maxtriggers | 16 | CHOP由来の同時トリガー上限 |

## 動作確認 / トラブルシュート

### 正しく動作している場合
- `trigger_panel` viewer をクリック → クリック位置から波紋が広がる
- 複数連打 → 波紋同士が物理的に重なって見える (線形加算)
- Lifetime 経過後に自然消失

### 動かないとき
- `rig.fetch('ripples_data', [])` で storage の中身を確認
- `ripples_list` の出力チャンネルに値が出てるか
- `ripple_render.totalCooks` がフレーム経過で増えてるか (毎フレ cook されてるか)
- `cook_drv` が ripples_list の input に正しく接続されているか
- `trigger_panel.par.top = 'OUT_PUBLIC'` で表示できているか

## 既知の制約

1. **反射しない**: 画面端で波が消える (Shadertoy 方式の特性)。 反射が欲しい場合は別途 wave equation 実装が必要。
2. **真の物理干渉ではなく線形加算**: 位相が完全に逆の波同士が打ち消し合うのは物理的に正しいが、 振幅の保存や非線形効果は再現されない。
3. **`pow(r², 0.7)`** によるradial shaping で「距離が遠いほど波長が伸びる」効果が出る。 物理的には不正確だが Shadertoy の見た目を再現するのに必要。

## Triggerchop によるパーティクル発生

`rippleRig.par.Triggerchop` に CHOP を bind すると、 そのCHOPから**自動的に波紋を発生**できる。

### CHOP の仕様

| Channel | 必須 | 役割 |
|---|---|---|
| `pulse` | ✓ | 0 → >0 の **立ち上がりエッジ**を検出して波紋発生 |
| `u` | (推奨) | 発生位置 X (0-1)。 無ければ 0.5 |
| `v` | (推奨) | 発生位置 Y (0-1)。 無ければ 0.5 |
| `strength` | 任意 | パーティクルごとの振幅。 無ければ `Strength` パラメータ値 |

注: 寿命は **常に `rig.par.Lifetime` の現在値**を採用する。 Trigger CHOP に `lifetime`
チャネルを持たせても今は無視される (パーティクル毎の override は未対応)。 これにより
`Lifetime` パラメータを動的に変えれば、 **既存の波紋も含めて全て**新しい寿命に従う。

`N samples = N particles`。 各サンプルが1パーティクルで、 pulse のエッジでそのサンプルの (u, v) から波紋発生。

### エッジ検出

`pulse > 0` の状態が**前フレも >0** なら新規発生しない。 `0 → >0` の遷移のみ反応。
これにより `pulse=1` を継続して送り続けても二重発生しない。

### デモdriver

`/project1/demo_driver` (scriptCHOP) に簡単な driver サンプル:
- 5パーティクルが個別にランダム位置で約1.5秒ごとに pulse=1
- 接続例: `rippleRig.par.Triggerchop = '/project1/demo_driver'`

### 接続パターン例 (パーティクル系)

```
particlesGPU → math (tx → u, ty → v) → trigger gate (寿命=0 のとき pulse=1) → rippleRig.par.Triggerchop
```

## その他の将来の拡張

- `OUT_PUBLIC` を `10_caustics/causticsRig2` の heightmap 入力に流して「水面の雨が caustics として光る」表現
- 法線出力を使った background refraction (Shadertoy 元コードの後半部分)
- reflect 環境テクスチャ合成 (金属水銀風)
