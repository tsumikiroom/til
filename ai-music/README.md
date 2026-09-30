# AI 音楽制作

音楽制作未経験から AI で音楽を作り始めるための学習・実験ノート集。

**方針:** Suno / Udio などの Web サービスを使い、**自分で録音したフィールドレコーディング・声・物音を素材にしたアンビエント / エレクトロニカ** を作る。

## コンセプト

楽器演奏スキルなしで、AI 音楽生成サービスの **Audio Upload (素材アップロード) 機能**を起点にする。

- **人間** = 素材集め (録音) + アレンジ判断
- **AI** = 音楽的展開 (Extend / Remix)

これは Brian Eno, Tim Hecker, William Basinski 等のアンビエント大家がやっている「素材 + プロセス」型の制作を、1 人で実行可能にする発想。

## 進め方 (推奨順序)

1. **コンセプトを理解** → [workflows/field-recording-ambient.md](workflows/field-recording-ambient.md) で素材ベース制作の全体像を掴む
2. **サービスを選ぶ** → [services/suno-overview.md](services/suno-overview.md) と [services/udio-overview.md](services/udio-overview.md) を読み比べる
3. **ジャンルを掴む** → [genres/ambient-electronica.md](genres/ambient-electronica.md) でアンビエント / エレクトロニカの語彙と代表作を知る
4. **プロンプトを学ぶ** → [prompting/prompt-design-basics.md](prompting/prompt-design-basics.md) で指示の書き方を覚える (素材ありプロンプトの節あり)
5. **素材を録る** → [recordings/](recordings/) に保管 (命名規則は recordings/README.md 参照)
6. **生成する** → サービスにアップロード → Extend / Remix
7. **記録する** → 結果を [archive/](archive/) に保存し、プロンプトと所感を残す
8. **ビジュアル化を考える** → [touchdesigner-integration.md](touchdesigner-integration.md) で生成音源を TouchDesigner で使う段取りを確認

## ディレクトリ構成

```
ai-music/
├── README.md                       # このファイル
├── workflows/
│   └── field-recording-ambient.md  # 素材ベース制作のワークフロー (主軸)
├── services/
│   ├── suno-overview.md            # Suno: 料金・特徴・強み弱み
│   └── udio-overview.md            # Udio: 料金・特徴・強み弱み
├── prompting/
│   └── prompt-design-basics.md     # プロンプト設計の基本 (素材ありプロンプト含む)
├── genres/
│   └── ambient-electronica.md      # アンビエント / エレクトロニカの基礎知識
├── recordings/                     # 自分で録音した素材 (人間が用意する原料)
│   └── README.md                   # 録音の命名・整音・カテゴリ
├── archive/                        # AI 生成した曲 (AI が出力する完成品)
│   └── README.md                   # 生成曲の命名規則とメタデータテンプレート
└── touchdesigner-integration.md    # 生成音源を TD で使う計画
```

**`recordings/` と `archive/` の違い:**
- `recordings/` — 人間が録音した原料 (フィールドレコーディング、声、物音)
- `archive/` — AI が生成した完成品 (上記素材をアップロードして AI が拡張したもの)

## 関連ノート (既存)

- [../audio-reactive/fft-audio-reactive-touchdesigner.md](../audio-reactive/fft-audio-reactive-touchdesigner.md) — FFT / オーディオリアクティブの実装ガイド。生成した音源を TouchDesigner で可視化する際に再利用する。

## 今後のセッションでやること

- スマホで素材を 5〜10 個録音 → `recordings/` に保管
- Suno Free にサインアップ → 1 つの素材で Extend を試す
- うまくいったプロンプトを [prompting/prompt-design-basics.md](prompting/prompt-design-basics.md) に追記
- 試行ログを [archive/](archive/) に蓄積
- 気に入った曲が出たら TouchDesigner プロジェクトでビジュアル化
