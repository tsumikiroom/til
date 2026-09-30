# ファブリック × インスタレーション

LT 用 (10 分前後、エンジニア中心 + 企画にもつなげたい層) のノート集。「ファブリックの基礎 → インスタレーションに使えるトレンド → 企画への橋渡し」の三層構成。

各章はスライド数枚分のメモ。LT 準備時はここから抜粋する。

## ファブリックとは (定義)

このノート群では **ファブリック (fabric) ≒ 布** として扱う。

- 広義: 繊維 (fiber) を糸にし、織る・編む・絡める・接着するなどして得られる**柔軟な面状素材**全般
- 狭義 (本ノートの主対象): 衣料・空間装飾・インスタレーションで使われる**布地**
- 含むもの: 織物 (woven)、編物 (knit)、不織布 (nonwoven)、ネット / メッシュ
- 含まないもの (今回のスコープ外): フィルム単体、革、樹脂シート (ただし PVC コート布のような布 + 樹脂のハイブリッドは含む)

「テキスタイル (textile)」「布」「生地」もほぼ同義として用いる。LT で「ファブリック」と言うとき、聴衆はまず**布**を思い浮かべればよい。

繊維 → 糸 → 布 という構成階層の詳細は [basics/fiber-types.md](basics/fiber-types.md) と [basics/weaving-knitting.md](basics/weaving-knitting.md) を参照。

## LT アウトライン (10 分 / 20 枚想定)

| # | スライド見出し | ノート |
|---|---------------|--------|
| 1 | タイトル: ファブリックという素材 | — |
| 2 | なぜ今ファブリックか (光・空気・身体・サステナ) | [planning-hints.md](planning-hints.md) |
| 3 | 繊維の三大分類 (天然 / 合成 / 機能性) | [basics/fiber-types.md](basics/fiber-types.md) |
| 4 | 織り・編み・不織布 (構造で挙動が変わる) | [basics/weaving-knitting.md](basics/weaving-knitting.md) |
| 5 | 物性で語るファブリック (透光・吸音・難燃) | [basics/physical-properties.md](basics/physical-properties.md) |
| 6 | 〈中盤〉インスタレーションでの 5 つの使い方 | (この目次ページ) |
| 7 | ①テンション膜・吊り構造 | [installation-trends/tensioned-membrane.md](installation-trends/tensioned-membrane.md) |
| 8 | ②投影面としてのファブリック | [installation-trends/projection-surface.md](installation-trends/projection-surface.md) |
| 9 | ③e-textiles (導電糸・LED 織り込み・センサ) | [installation-trends/e-textiles.md](installation-trends/e-textiles.md) |
| 10 | ④Kinetic Fabric (動く布) | [installation-trends/kinetic-fabric.md](installation-trends/kinetic-fabric.md) |
| 11 | ⑤巨大スケール / 環境介入 | [installation-trends/case-studies.md](installation-trends/case-studies.md) |
| 12 | 〈事例〉Christo "The Gates" | [installation-trends/case-studies.md](installation-trends/case-studies.md) |
| 13 | 〈事例〉塩田千春 "The Key in the Hand" | [installation-trends/case-studies.md](installation-trends/case-studies.md) |
| 14 | 〈事例〉teamLab "Forest of Resonating Lamps" | [installation-trends/case-studies.md](installation-trends/case-studies.md) |
| 15 | 〈事例〉UVA "Volume" / Numen "String" | [installation-trends/case-studies.md](installation-trends/case-studies.md) |
| 16 | 〈事例〉Studio Drift "Drifters" (kinetic) | [installation-trends/case-studies.md](installation-trends/case-studies.md) |
| 17 | エンジニア視点での選び方 (物性 → 用途) | [planning-hints.md](planning-hints.md) |
| 18 | 企画への橋渡し: なぜ布で、なぜ今 | [planning-hints.md](planning-hints.md) |
| 19 | 入手・素材メーカー・コミュニティ | [references.md](references.md) |
| 20 | まとめ + Q&A | — |

## ディレクトリ構成

```
fabric-installation/
├── README.md                          # このファイル (LT アウトライン)
├── outline.md                         # 解説の流れ (7 部構成のドラフト)
├── basics/
│   ├── variables.md                   # ファブリックを特徴づける変数 (早見表)
│   ├── fiber-types.md                 # 繊維の分類 / 材料
│   ├── weaving-knitting.md            # 織り / 編み / 不織布 / 紡績 / ジャガード / 工程
│   ├── dyeing-finishing.md            # 染 / プリント / 後加工
│   └── physical-properties.md         # 物性数値 + 見え感 (反射・拡散・透過 / 3DCG)
├── installation-trends/
│   ├── tensioned-membrane.md          # テンション構造
│   ├── projection-surface.md          # 投影面ファブリック
│   ├── e-textiles.md                  # 導電・センサテキスタイル
│   ├── kinetic-fabric.md              # 動く布
│   └── case-studies.md                # 代表作品集
├── planning-hints.md                  # 企画への橋渡し
└── references.md                      # 出典・メーカー・コミュニティ
```

## 関連ノート (既存・相互参照)

- [../projection-mapping/references.md](../projection-mapping/references.md) — プロジェクションマッピング 6 分類 (投影面の選び方の隣接知識)
- [../projection-mapping/vertical-signage-references.md](../projection-mapping/vertical-signage-references.md) — 縦型サイネージ × 素材の例
- [../audio-reactive/fft-audio-reactive-touchdesigner.md](../audio-reactive/fft-audio-reactive-touchdesigner.md) — kinetic fabric を音で駆動する場合の参考
