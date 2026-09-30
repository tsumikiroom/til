# 生成音源 × TouchDesigner 連携計画

AI で生成した音楽ファイル (MP3/WAV) を TouchDesigner に取り込み、ビジュアルを駆動する。既存の FFT オーディオリアクティブ知見を再利用する。

## 前提となる既存ノート

- [../audio-reactive/fft-audio-reactive-touchdesigner.md](../audio-reactive/fft-audio-reactive-touchdesigner.md) — FFT 分解、スペクトル表示、3D ジオメトリ変形、パーティクル、GLSL シェーダー連携の実装ガイド
- [../realtime-ai-video-generation/touchdesigner-integration.md](../realtime-ai-video-generation/touchdesigner-integration.md) — AI 生成物と TouchDesigner の連携パターン (File TOP 監視、UDP 制御、Spout 出力など)

## 基本パイプライン

```
[Suno/Udio で生成]
       ↓ (MP3/WAV ダウンロード)
[archive/ に保存]
       ↓
[TouchDesigner: Audio File In CHOP]
       ↓
[Audio Spectrum CHOP / Audio Band EQ CHOP]
       ↓
[ビジュアル系オペレータ群 (TOP/SOP/GLSL)]
       ↓
[Window COMP / Spout / Movie File Out TOP]
```

## TouchDesigner 側のセットアップ手順

### 1. オーディオ読み込み

- `Audio File In CHOP` で `archive/` 内の音源ファイルを指定
- `play` パラメータを on にして再生
- 出力をスピーカーへ送る場合は `Audio Device Out CHOP`

### 2. 周波数分解

- `Audio Spectrum CHOP` で FFT 分解 (FFT Size: 1024, Window: Hann)
- 既存ノート [../audio-reactive/fft-audio-reactive-touchdesigner.md](../audio-reactive/fft-audio-reactive-touchdesigner.md) のパラメータ表を参照

### 3. 帯域抽出

- `Audio Band EQ CHOP` または `Math CHOP` でビン範囲を平均し、Bass / Mid / High に分割
- アンビエント帯では Mid〜High の繊細なテクスチャが効くことが多い (Bass は薄め)

### 4. ビジュアル駆動

| 用途 | TouchDesigner ノード |
|------|---------------------|
| 全体音量で輝度制御 | `Audio Analysis CHOP` → `Level TOP` |
| 周波数帯で形状変形 | `Audio Spectrum CHOP` → `Geometry COMP` の `tx/ty/sz` |
| パーティクル放出量 | スペクトル → `Particles GPU TOP` の emission rate |
| GLSL シェーダー uniform | スペクトル → `GLSL TOP` の vec uniform |

## アンビエント素材を扱う際の注意

アンビエント音源は**ダイナミクスが小さい** (音量変化が少ない) ので、ビジュアルが「ほとんど動かない」状態になりやすい。対策:

- **正規化**: `Math CHOP` の `from/to range` で帯域の値を `0〜1` に強制マップ
- **ローパスフィルタ**: `Lag CHOP` で時間平滑化、急激な変化を避けて滑らかに
- **微細な変化の増幅**: 帯域の差分 (前フレームとの差) を取り、それをビジュアルに当てる
- **絶対値ではなくスペクトル形状で動かす**: 全体音量はほぼ一定でも、周波数分布は時々刻々変わるので「最強帯域の中心周波数」を時系列で取り出す手も

具体的な実装パターンは [../audio-reactive/fft-audio-reactive-touchdesigner.md](../audio-reactive/fft-audio-reactive-touchdesigner.md) を参照。

## アンビエント向けに合うビジュアルアイデア

- **ゆっくり拡縮する流体的ジオメトリ** — 主要帯域のエネルギーで形状を膨張収縮
- **粒子系の長尺残像** — High 帯のエネルギーで放出、ライフ長く・速度遅く
- **シェーダーノイズの時間変化** — 帯域のスムーズな移動で `time` 軸を歪ませる
- **テクスチャの色相シフト** — Mid 帯のエネルギーで HSL の H を変える (派手すぎない範囲で)
- **既存の四分木モザイク** [../quadtree-mosaic/](../quadtree-mosaic/) — ノイズ入力にスペクトルを使う実験ができる

## ワークフロー

1. AI で曲を生成し、`archive/` に保存 (命名規則は [archive/README.md](archive/README.md) 参照)
2. TouchDesigner で `.toe` プロジェクトを開く (または新規作成)
3. `Audio File In CHOP` でファイル指定 → 再生確認
4. スペクトル分解 → 帯域抽出 → ビジュアルへ
5. レンダリング (`Movie File Out TOP` で書き出し、あるいはライブパフォーマンス用に `Window COMP` で別ディスプレイ出力)

## オフラインレンダリング vs リアルタイム

| 用途 | 推奨 |
|------|------|
| 完成度の高い映像作品 | `Movie File Out TOP` でオフラインレンダ。音と映像の同期が確実 |
| ライブパフォーマンス | リアルタイム再生 + 別ディスプレイ出力 |
| ループ素材 (VJ 用) | 短いセクションを書き出して VJ ソフトへ |

## 次にやること

- まず AI で 1 曲生成して `archive/` に置く
- 既存の `audio-reactive/` ディレクトリに簡単な TouchDesigner サンプルプロジェクトがあれば再利用、なければ最小構成の `.toe` を作る
- 1 曲につき 1 つビジュアルパターンを試して、知見を蓄積する
