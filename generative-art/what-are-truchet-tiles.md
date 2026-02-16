# What are Truchet Tiles?

> 参考: https://questionsindataviz.com/2021/03/03/what-are-truchet-tiles/

## 概要

Truchet タイルは、回転非対称な正方形タイルをグリッドに並べることで、連続したパターンを生成する手法。ランダムに配置しても数学的に一貫したパターンが生まれる。

## Smith タイル

最も基本的な Truchet タイルは **Smith タイル**（対角に対向する2つの四分円で構成）。方向は2通りしかないためシンプルだが、バリエーションは限られる。

## 応用：データビジュアライゼーション

Christopher Carlson が発展させた Multi-Scale Truchet Patterns では、15種類の重なり合うタイルデザインを使用。このタイル群を使い、データ値（1〜15）をタイルの種類にマッピングすることでデータ可視化が可能。

### 実例（Neil Richards の実装）

- テキストの最初の64単語を1〜15の数値に変換
- スクラブルのスコアを使って単語ごとにタイルを選択
- Tableau のポリゴン機能で実装
- シェイクスピア、オーウェル、ビートルズの作品などで試作

## まとめ

| 要素 | 内容 |
|------|------|
| 基本形 | Smith タイル（2方向の回転） |
| 発展形 | Carlson の15種タイル（多様なパターン） |
| 応用例 | データ値をタイル種別にマッピングした可視化 |
| 実装ツール | Tableau（ポリゴン機能） |

## 関連リンク

- [Multi-scale Truchet Patterns - Christopher Carlson](https://christophercarlson.com/portfolio/multi-scale-truchet-patterns/)
- [Truchet tile - Wikipedia](https://en.wikipedia.org/wiki/Truchet_tile)
