# Caustics_v1.toe セットアップ手順

参考画像 [`references/bf06573c82367cf61732caefac615c5d.jpg`](../references/bf06573c82367cf61732caefac615c5d.jpg) のプール水底コースティクスを GLSL TOP 1枚で再現する。

## 必要ファイル
- [caustics.frag](caustics.frag) — フラグメントシェーダ本体

## 手順

### 1. 新規プロジェクト作成
TouchDesigner で空のプロジェクトを開き、`touchdesigner/Caustics_v1.toe` として保存。

### 2. GLSL TOP を配置
`Op Create > TOP > GLSL` で `glsl1` を作成し、リネームして `caustics`。

**Common タブ:**
- Resolution: `1920 x 1080`
- Pixel Format: `RGBA 16-bit float`

**GLSL タブ:**
- Pixel Shader: `+` ボタンから `Add Pixel Shader DAT`
- 生成された `glsl1_pixel` DAT を開き、[caustics.frag](caustics.frag) の中身を全コピペ

### 3. Custom Parameters を追加
`caustics` GLSL TOP の右上歯車 `Customize Component` から:

| Page | Parameter | Type | Default | Min | Max |
|---|---|---|---|---|---|
| Caustics | uScale | Float | 8.0 | 3.0 | 20.0 |
| Caustics | uSpeed | Float | 0.5 | 0.0 | 2.0 |
| Caustics | uSharp | Float | 8.0 | 2.0 | 16.0 |
| Caustics | uColorA | RGB | 0.10, 0.43, 0.55 | — | — |
| Caustics | uColorB | RGB | 0.85, 0.98, 1.00 | — | — |

### 4. uniform をバインド
`caustics` GLSL TOP の `Vectors 1` ページで:

| Uniform Name | Value (Expression) |
|---|---|
| uScale | `me.par.Uscale` |
| uSpeed | `me.par.Uspeed` |
| uSharp | `me.par.Usharp` |
| uColorA | `me.par.UcoloraR` `me.par.UcoloraG` `me.par.UcoloraB` |
| uColorB | `me.par.UcolorbR` `me.par.UcolorbG` `me.par.UcolorbB` |

注: TouchDesigner は Custom Parameter の頭文字を大文字にして `me.par.Xxxx` として参照する。

### 5. 出力ノード
`caustics` の後ろに `Null TOP` を置き、`OUT` にリネーム。後段の合成時の固定参照点。

### 6. パラメータ UI (任意)
`Slider COMP` を追加し、各 Slider の Value を `op('caustics').par.Uscale` などにバインド。色は `Color COMP` で。

### 7. 保存
`Caustics_v1.toe` として保存。

## 動作確認

| Step | 操作 | 期待結果 |
|---|---|---|
| 1 | 起動 | OUT に多角形セル網目が表示 |
| 2 | uScale を 3→20 にスイープ | セル数がスムーズに増減 |
| 3 | uSpeed を 0 にする | アニメ停止 |
| 4 | uSpeed を 1.5 にする | 活発に揺らぐ |
| 5 | uSharp を 2 にする | ハイライトが太くソフト |
| 6 | uSharp を 16 にする | ハイライトが髪の毛のように細い |
| 7 | 参考画像と並べる | セル形状・色が同系統 |
| 8 | Perform Mode で計測 | 1920×1080 / 60fps 安定 |

## トラブルシューティング

- **真っ黒**: GLSL DAT に `Compile Errors` が出ていないか確認。`Info DAT` をぶら下げると詳細が見える
- **チェッカー模様**: Resolution の Aspect が極端 (例 1:5) だと UV が歪む。`uScale` を上げて補正
- **パラパラ動く**: `uSpeed` が高すぎる。0.3〜0.8 が参考画像に近い
- **色が出ない**: Vectors 1 ページで vec3 uniform を **3要素全部** バインドしているか確認

## 次のステップ (このプランの外)
- パース付き視点 → `Transform TOP` で台形変形
- 色収差版 → RGB ごとに UV を微小オフセット
- v2 への合成 → 液体玉の落下点を `position` として渡し、波紋発生地点として使う
