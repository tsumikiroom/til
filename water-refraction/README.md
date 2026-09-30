# water-refraction

水に関するリアルタイムグラフィックスのR&Dプロジェクト集。
各エフェクトは独立した `.toe` として実装し、 必要に応じて組み合わせる。

## ディレクトリ構造

| Dir | 内容 |
|---|---|
| `00_references/` | 共通の参考画像 (エフェクト種別ごとにsubdir) |
| `10_caustics/` | コースティクス (Unity アセットを完全移植・完成済) |
| `20_ripples/` | 水面波紋 (波動方程式で複数波紋干渉・実装中) |
| `30_refraction-portraits/` | 水越し人物表現 (未着手) |
| `40_liquid-type/` | 液体タイポグラフィ (Water-Refrection_v2 を含む) |
| `99_archive/` | 古い `.toe` / 試行錯誤ファイル群 |

## エフェクト一覧

| ID | 名前 | 状態 | .toe |
|---|---|---|---|
| 10 | Caustics | 完成 | `10_caustics/caustics.toe` |
| 20 | Ripples | 完成 | `20_ripples/ripples.toe` |
| 30 | Refraction Portraits | 未着手 | — |
| 40 | Liquid Type | 既存作品 | `40_liquid-type/water-refrection-v2.toe` |

各エフェクトディレクトリ内に `README.md` (使い方・パラメータ仕様)、 `research/` (技術調査ノート)、
`shaders/` (将来 shader 外出し用) を置く。

## 命名規則

- ディレクトリ prefix `00`, `10`, `20`, ... はカテゴリ番号 (順序とグループ化)
- ファイル名は **小文字 + ハイフン** (例 `pool-bottom.jpg`)
- `.toe` は1ディレクトリ1ファイル原則 (履歴は `99_archive/_backups/` に)
