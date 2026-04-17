# FFT オーディオリアクティブ実装（TouchDesigner）

## 概要

リアルタイムの音楽入力をFFTで周波数分解し、4種類のビジュアルを同時に駆動するシステム。

- 周波数スペクトル表示（イコライザーバー）
- 3Dジオメトリ変形
- パーティクル/粒子系
- 抽象GLSLシェーダー映像

---

## FFT 基礎

### 時間領域 → 周波数領域

FFT（高速フーリエ変換）は、時間軸上の音声波形を各周波数成分のエネルギーに分解するアルゴリズム。

- 入力：N サンプルの音声データ（時間軸）
- 出力：N/2 の周波数ビン（ナイキスト定理により半分）
- 各ビン：その周波数帯のエネルギー（振幅）を表す

### 主要パラメータ

| パラメータ | 推奨値 | 理由 |
|---|---|---|
| FFT Size | 1024 | 周波数分解能（43 Hz/bin at 44.1kHz）と応答速度のバランス |
| Sample Rate | 44100 or 48000 | システム設定に合わせる |
| Window Function | Hann | スペクトルリーク抑制に汎用的で優秀 |
| Log Frequency | ON | 人間の知覚・音楽理論に沿った帯域分割 |

**FFT Size のトレードオフ：**
- 大きい（2048+）→ 周波数分解能が高い、応答が遅い
- 小さい（512）→ リアルタイム性が高い、周波数分解能が低い

### ウィンドウ関数

FFT計算時に端部での不連続性（スペクトルリーク）を抑えるために波形に掛け算する関数。

| ウィンドウ | 特性 | 用途 |
|---|---|---|
| Hann | バランス良好、汎用 | ほぼすべての音楽分析 |
| Hamming | サイドローブ抑制が強め | 近接周波数の識別 |
| Blackman | 最もリーク少ない、分解能低下 | 振幅差の大きい信号 |
| Rectangle（なし） | 最高分解能、リーク最大 | 特殊用途のみ |

### 周波数帯域マッピング

**ビン → Hz の変換式：** `周波数 = (ビン番号 × サンプルレート) / FFT Size`

| 帯域 | 周波数 | ビジュアル用途 |
|---|---|---|
| Sub-Bass | 20–60 Hz | 全体サイズ、低域ラムブル |
| Bass | 60–250 Hz | キック検出、スケール変動 |
| Low Mid | 250–1000 Hz | 暖かさ、楽器の胴体 |
| Mid | 1000–4000 Hz | 色相シフト、スネア反応 |
| Treble | 4000–20000 Hz | 細部の複雑さ、シマー |

---

## TouchDesigner 実装アーキテクチャ

### 全体シグナルチェーン

```
[Audio Device In CHOP]
        │
        ▼
[Analyze CHOP: FFT, 1024, Hann, Log Freq ON]
        │
   ┌────┴────────────┬──────────────────────┐
   ▼                 ▼                      ▼
[Bass Band]       [Mid Band]            [Treble Band]
[Math CHOP]       [Math CHOP]           [Math CHOP]
   │                 │                      │
[Lag 0.15]        [Lag 0.08]            [Lag 0.05]
   │                 │                      │
   └────────────┬────┘                      │
                ▼                           │
        [Beat Detection]                    │
        (Trigger CHOP)                      │
                                            │
   ┌────────────┬───────────┬───────────────┘
   ▼            ▼           ▼               ▼
[Spectrum   [3D Geo      [Particle      [GLSL Shader
 Bars TOP]   Deform]      System]        TOP]
```

### スムージング設定指針

| Lag値 | 効果 | 用途 |
|---|---|---|
| 0.05 | 高速追従、わずかにスムーズ | ハイハット、高域 |
| 0.08〜0.1 | 中速、残響感あり | 中域、スネア |
| 0.15〜0.2 | ゆっくり追従、浮遊感 | バス、キック |
| 0.3+ | 重い追従、夢幻的 | 全体の雰囲気 |

---

## 各ビジュアルの実装

### 1. 周波数スペクトル表示

```
[Analyze CHOP: FFT, Log Freq ON]
  → [Lag CHOP: 0.05]
  → [CHOP to TOP: Height mode]
    → [Level TOP: Colorize]
      → [Ramp TOP: Gradient multiply]
        → [Bloom TOP]
```

- Analyze CHOPの出力チャンネル数 = バーの本数（通常32〜64本）
- CHOP to TOPでチャンネルを横1列のピクセルとして画像化
- Level TOPで高さ方向スケール＋着色
- Ramp TOPとMultiply合成でグラデーショングロー効果

### 2. 3Dジオメトリ変形

```
[Sphere SOP or Grid SOP]
  → [CHOP to SOP: Translate Y per vertex]
[Bass Lag CHOP]   → op('bass_lag')['chan1']  → Scale parameter
[Mid Lag CHOP]    → op('mid_lag')['chan1']   → Color/Hue parameter
```

**パラメータexpressionの記法：**
```python
op('bass_lag')['chan1']          # 基本的なCHOP値参照
op('bass_lag')['chan1'] * 2.0    # スケール係数を掛ける
1.0 + op('bass_lag')['chan1']    # 最小値1.0から拡大
```

**GLSL Vertex Shaderによる上級変形：**
```glsl
// uniform floatでCHOP値を受け取る
uniform float uBass;
uniform float uTime;

void main() {
    vec3 pos = P;
    // 法線方向にbass振幅でdisplace
    pos += N * uBass * 0.3;
    // sin波で有機的な揺らぎを追加
    pos += N * sin(pos.y * 5.0 + uTime) * 0.05;
    gl_Position = TDWorldToProj(TDDeform(pos));
}
```

### 3. パーティクル/粒子系

```
[Particle SOP]
  → Emit Rate  ← [Beat Pulse CHOP * 200]
  → Force Y    ← [Mid Lag CHOP * -0.5]   (上昇力)
  → Turbulence ← [Treble Lag CHOP * 2.0]
[Render TOP]
  → [Bloom TOP]
```

- ビートパルスでEmit Rateをスパイク → 音の打点感を視覚化
- 低域（重力的な引力）/ 高域（乱流・混沌）で対照的な動き
- GPU効率向上：Point InstanceをGeo COMPで使う

### 4. 抽象GLSLシェーダー映像

**ノード接続：**
```
[Analyze CHOP: 全スペクトル]
  → [CHOP to TOP]  → [GLSL TOP: Input 0 = uFFT texture]
[Bass Lag CHOP]    → [GLSL TOP: uniform float uBass]
[Mid Lag CHOP]     → [GLSL TOP: uniform float uMid]
[Treble Lag CHOP]  → [GLSL TOP: uniform float uTreble]
op.absTime.seconds → [GLSL TOP: uniform float uTime]
```

**GLSLシェーダー設計パターン（Domain Warping + fbm）：**
```glsl
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uTime;
uniform sampler2D uFFT;

// fbmノイズ関数
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = p * 2.0 + uTime * 0.1;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = vUV.xy;

    // uBassで渦巻き・歪み量を制御
    vec2 q = vec2(fbm(uv + uTime * 0.1));
    vec2 r = vec2(fbm(uv + q + uBass * 2.0));

    float f = fbm(uv + r);

    // uMidでカラーパレットをシフト（hue rotation）
    vec3 col = mix(
        vec3(0.1, 0.2, 0.8),
        vec3(0.9, 0.3, 0.1),
        clamp(f * f * 4.0 + uMid, 0.0, 1.0)
    );

    // uFFTテクスチャから周波数サンプリング
    float fftVal = texture(uFFT, vec2(uv.x, 0.5)).r;
    col += fftVal * uTreble * 0.5;

    fragColor = vec4(col, 1.0);
}
```

---

## Beat Detection

```
[Bass Band Math CHOP]
  → [Lag CHOP: 0.05]           ← 高速アタック（キックの立ち上がりを捕捉）
  → [Math CHOP: Clamp > 0.65]  ← 閾値処理（0 or 1のパルス）
  → [Trigger CHOP]             ← Attack: 10ms / Release: 300ms
```

- Trigger CHOPがパルスをエンベロープ化 → フラッシュ/スケールジャンプに使用
- 閾値（0.65）は音源によって調整が必要

---

## 実装ステップ

1. **オーディオ入力セットアップ**
   - Audio Device In CHOP → デバイス選択・レベル確認
   - Analyze CHOP（FFT / 1024 / Hann / Log Freq ON）接続・Timeline表示で確認

2. **帯域分割CHOPチェーン構築**
   - Bass / Mid / Treble 各 Math CHOP + Lag CHOP
   - Beat Detection（Trigger CHOP）セットアップ

3. **スペクトル表示**
   - CHOP to TOP → Level TOP → Bloom TOP

4. **3Dジオメトリ変形**
   - SOP + パラメータexpressionでCHOP参照
   - GLSL Vertex Shader（上級変形）

5. **パーティクルシステム**
   - Particle SOP or GPUパーティクル
   - Emit Rate / Force / TurbulenceをCHOPで駆動

6. **GLSLシェーダーTOP**
   - uFFTテクスチャ（CHOP to TOP経由）+ uniform float群
   - Domain Warping + fbmベースで記述

7. **コンポジット統合**
   - 各ビジュアルを Composite TOP で合成
   - Blend Mode（Add / Over / Multiply）で重ね方を調整

---

## 重要ノード一覧

| ノード | 主要パラメータ | 役割 |
|---|---|---|
| Audio Device In CHOP | Device: 入力デバイス | ライブ音声入力 |
| Analyze CHOP | Mode: FFT / Size: 1024 / Window: Hann / Log Freq: ON | 周波数分解 |
| Math CHOP | Combine: Sum, Normalize | 帯域抽出・正規化 |
| Lag CHOP | Lag: 0.05〜0.2 | 指数平滑化（スムージング） |
| Filter CHOP | Type: Low Pass / Cutoff: 2〜10 Hz | 高精度スムージング |
| Trigger CHOP | Attack: 10ms / Release: 300ms | ビートパルス整形 |
| CHOP to TOP | Mode: Height | CHOPチャンネルを画像化 |
| GLSL TOP | + uniform float/sampler2D | カスタムフラグメントシェーダー |
| Particle SOP | Emit / Force / Turbulence | パーティクル生成・制御 |
| Composite TOP | Blend Mode | 複数TOP合成 |
| Bloom TOP | Threshold / Size | グロー効果 |

## 参考

- [TouchDesigner公式ドキュメント - Analyze CHOP](https://docs.derivative.ca/Analyze_CHOP)
- [TouchDesigner公式ドキュメント - GLSL TOP](https://docs.derivative.ca/GLSL_TOP)
