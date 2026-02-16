# Truchet Tile

> 参考: https://en.wikipedia.org/wiki/Truchet_tile

## 概要

Truchet タイルとは、回転非対称なパターンで装飾された正方形タイル。正方形のタイリング平面に配置することで、タイルの向きによってさまざまなパターンを形成する。

## 歴史

- **1704年**: フランスの数学者 Sébastien Truchet が論文 "Mémoire sur les combinaisons" で初めて記述
  - 床タイルが積まれているのを見て着想を得た
- **1987年**: Cyril Stanley Smith が普及させ、四分円バリエーションを導入

## タイルの種類

### オリジナル Truchet タイル（対角線型）

- 正方形を対角線で2色（白・黒）に分割した三角形
- **4方向の回転**が可能
- Truchet はタイル2枚の組み合わせで生まれる全パターンを列挙し、回転後の64通りを10種の等価クラスに整理した

### Smith タイル（四分円型）

- 隣接する辺の中点を結ぶ**2つの四分円**で構成
- **2方向の回転**のみ
- ランダム配置でも美しい「さまよう路」を形成

## 数学的性質

- **接続性解析**: パーコレーション理論（bond percolation）で分析可能
- **臨界点**: 対角方向グリッドの臨界点でのパーコレーションに対応
- **平面タイリング**: 周期的・ランダムどちらの配置でも平面を埋められる

## 応用

- 情報可視化・グラフィックデザイン
- データ値のエンコード（タイルの向きで情報を表現）
- ジェネラティブアート

## まとめ

| 種類 | 特徴 | 回転数 |
|------|------|--------|
| 対角線型（オリジナル） | 三角形2色 | 4方向 |
| 四分円型（Smith） | 弧状の連続パターン | 2方向 |

## 関連リンク

- [Multi-scale Truchet Patterns - Christopher Carlson](https://christophercarlson.com/portfolio/multi-scale-truchet-patterns/)
- [Truchet tile - Wikipedia](https://en.wikipedia.org/wiki/Truchet_tile)
- [Sébastien Truchet - Wikipedia](https://en.wikipedia.org/wiki/S%C3%A9bastien_Truchet)
