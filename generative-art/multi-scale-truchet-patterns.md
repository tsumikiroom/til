# Multi-Scale Truchet Patterns

## 概要

Truchet タイルは、1704年にフランスの数学者 Sébastien Truchet が考案した正方形タイルのパターン。対角線や四分円で2色に分割されたタイルをグリッドに並べることで、連続したパターンを生成する。

Multi-Scale（マルチスケール）版は Christopher Carlson が発展させた手法で、異なるスケールのタイルを組み合わせて階層的なパターンを作る。

---

## 基礎知識

### Truchet タイルの種類

| 種類 | 説明 |
|------|------|
| 対角線型（オリジナル） | 正方形を対角線で2色に分割。4方向の回転が可能 |
| 四分円型（Smith タイル） | 隣接する辺の中点を結ぶ2つの四分円。2方向の回転が可能 |
| 迷路型 | 対角線入りの白黒正方形。接続ネットワークを生成 |

### 基本原理

- タイルは回転非対称であることが必須
- グリッドに並べたとき、隣接タイルの模様が継続的につながる
- ランダムに配置しても数学的に一貫したパターンが生まれる

---

## Multi-Scale Truchet の仕組み（Carlson の手法）

### スケーリング原理

- 各階層でタイルサイズを **1/2** に縮小
- 縮小のたびに **白黒を反転**
- タイル辺の **1/3 と 2/3 の位置** に接続点を配置し、スケール間でシームレスに繋がる

### "ウィング付き" タイル

Carlson のタイルは点線の境界を超えて延伸する「ウィング」を持つ。

1. 点線の境界に沿ってタイルを配置
2. ウィングが自然に隣のタイルに重なる
3. 余った端点が接続され、統一された色のドメインを形成
4. 各スケールで色反転しながら再帰的に適用

### 実装

Carlson は Wolfram Language パッケージ `MultiScaleTruchetPatterns.wl` を開発。ランダム配置・グリッド・カスタム形状に対応。

---

## 実装パターン

### Houston の Processing 実装

**データ構造**
- **タイルオブジェクト配列**: 配置済みタイルのインスタンス管理
- **グリッド状態配列（2D）**: 各セルの占有状態（空き/埋まり）を管理

**アルゴリズム**
1. タイルサイズを選択
2. 2D グリッドをネストループで走査
3. セルが空いているか確認
4. 空いていれば配置

**失敗から学んだこと**: 1次元配列でのアプローチはスケール2以上で動作せず、2D配列に切り替えることで解決。

### Nedbatchelder の画像変換実装

写真を Truchet タイルで表現するアルゴリズム：

1. **ソース解析**: 写真をグレースケール輝度値に変換
2. **再帰的分割**: 全体を1つの正方形として開始
3. **閾値評価**: 内部の色のばらつきが閾値を超えたら分割
4. **タイル選択**: 各正方形内の輝度に合った向き・種類を選択
5. **レンダリング**: 適切なスケールでタイルを合成

アニメーション: 分割閾値を動的に変化させると、細部が段階的に現れるエフェクトを生成できる。

コード: [nedbat/truchet](https://github.com/nedbat/truchet)

### Tableau でのデータビジュアライゼーション（Neil Richards）

- データ値（1〜15）をタイルの種類にマッピング
- スクラブルの単語スコアなどをエンコードして可視化
- 15種類以上の重なりあうタイルデザインで多様な表現が可能

---

## 数学的性質

- **接続性**: パーコレーション理論（bond percolation）で分析可能
- **臨界点**: 対角方向グリッドの臨界点でのパーコレーションに相当
- **周期的/ランダム**: どちらの配置でも平面をタイリング可能

---

## 参考リンク

- [Multi-scale Truchet Tiling - Rob Houston (2024)](https://robhouston.net/2024/03/29/multi-scale-truchet-tiling/)
- [What are Truchet Tiles? - Questions in Data Viz (2021)](https://questionsindataviz.com/2021/03/03/what-are-truchet-tiles/)
- [Truchet Images - Ned Batchelder (2022)](https://nedbatchelder.com/blog/202208/truchet_images)
- [Truchet tile - Wikipedia](https://en.wikipedia.org/wiki/Truchet_tile)
- [Multi-scale Truchet Patterns - Christopher Carlson](https://christophercarlson.com/portfolio/multi-scale-truchet-patterns/)

---

## 関連 Issue

- [#1](https://github.com/tsumikiroom/til/issues/1) Multi-scale Truchet Tiling のメモ
- [#2](https://github.com/tsumikiroom/til/issues/2) What are Truchet Tiles? のメモ
- [#3](https://github.com/tsumikiroom/til/issues/3) Truchet Images のメモ
- [#4](https://github.com/tsumikiroom/til/issues/4) Truchet tile - Wikipedia のメモ
- [#5](https://github.com/tsumikiroom/til/issues/5) Multi-scale Truchet Patterns のメモ
