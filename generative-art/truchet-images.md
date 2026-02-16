# Truchet Images

> 参考: https://nedbatchelder.com/blog/202208/truchet_images

## 概要

Ned Batchelder が Truchet タイルを使って写真をアルゴリズム的に変換するアートプロジェクト。

## 使用タイルの種類

### Smith タイル

隣接する辺の中点を結ぶ2つの四分円で構成。ランダムに配置してもシームレスにつながる。

### Carlson タイル

Smith タイルを拡張した手法。異なるスケールでタイルを配置でき、1つの正方形を「色反転した4つの半サイズタイル＋ウィング」でカバーできる。

### カスタムタイルセット（N6）

Batchelder が独自に拡張したタイルセット。Carlson の15種よりも多くのバリエーションを持ち、より細かいトーン表現が可能。

## 写真変換アルゴリズム

1. **ソース解析**: 写真をグレースケール輝度値に変換
2. **正方形化**: 画像全体を1つの正方形として開始
3. **閾値評価**: 正方形内の色のばらつきが閾値を超えたら分割
4. **タイル選択**: 各正方形内の輝度に合った向き・種類を選択
5. **レンダリング**: 適切なスケールでタイルを合成

## アニメーション効果

分割閾値を動的に変化させることで、粗い表現から細部が段階的に現れるアニメーションを生成できる。

## 実装

- コード: [nedbat/truchet (GitHub)](https://github.com/nedbat/truchet)
- 対象画像例: マリリン・モンロー、作者本人のポートレート

## まとめ

| 要素 | 内容 |
|------|------|
| アプローチ | グレースケール輝度に基づく再帰的タイル選択 |
| タイルセット | Smith / Carlson / カスタム（N6） |
| 特徴 | スケール変化でフォトリアルな近似が可能 |
| アニメーション | 閾値変化による段階的な詳細表示 |

## 関連リンク

- [Multi-scale Truchet Patterns - Christopher Carlson](https://christophercarlson.com/portfolio/multi-scale-truchet-patterns/)
- [nedbat/truchet (GitHub)](https://github.com/nedbat/truchet)
