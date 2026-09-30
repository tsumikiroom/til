# Caustics

Unity アセット [WaterCausticsModules](https://assetstore.unity.com/packages/vfx/shaders/water-caustics-effect-for-urp-v2-201037)
(Masataka Hakozaki, 2021) のテクスチャ生成パイプラインを **TouchDesigner に完全移植** したもの。

水面の屈折光を物理シミュレーションで計算する:
- heightmap (多重 simplex noise) → 法線 → 屈折光線 → **隣接3点の三角形面積から光の集中度を逆算**

## ファイル

| Path | 内容 |
|---|---|
| `caustics.toe` | 本体 (Caustics_v1.6 を改名) |
| `research/unity-port-spec.md` | Unity アセット解析と TD 移植仕様 |
| `research/unity-caustics-algorithm.md` | アルゴリズム詳解 |
| `research/final-port-result.md` | 移植完了レポート |
| `research/final-pipeline.md` | 最終パラメータ調整結果 |
| `research/session-*-progress.md` | 作業日誌 |
| `_archive/` | 試行錯誤の中間 PNG 多数 + parameter sweep 結果 |
| `20260522_Caustics_v1.mp4` | 完成版動画 |

## 構成

`caustics.toe` 内に2つの完全独立な rig:

| Rig | 内部 grid 方式 |
|---|---|
| `/project1/causticsRig2` | SOP grid (Geometry COMP内) |
| `/project1/causticsRig2_POP` | SOP grid (POP geometry は GLSL MAT非対応のためSOPで運用) |

両rigとも以下を持つ:
- 完全な Unity アルゴリズムの GLSL 移植 (compute 3本 + Pass0 vertex displace + Blend Add)
- Custom Parameters (Caustics ページ + Post ページ + Resolution)
- リネーム耐性 (内部参照は全部 relative path)
- `OUT_PUBLIC` で外部公開

## Custom Parameters

### Caustics ページ
| Param | Default | 範囲 | 役割 |
|---|---|---|---|
| Density | 1.0 | 0-10 | 波の細かさ |
| Height | 1.0 | 0-10 | 波の高さ |
| Speed | 1.0 | 0-10 | アニメーション速度 |
| Flow | 0.25 | 0-5 | 全体的な流れ強度 |
| Flowdirection | -140 | -360 - 360 | 流れる方向 (度) |
| Refractionindex | 1.33 | 1-5 | 水の屈折率 |
| Brightness | 1.0 | 0-10 | 明るさ |
| Gamma | 1.0 | 0.0001-5 | コントラスト |
| Clamp | 1.0 | 0-10 | 上限 |
| Calcresolution | 256 | 64-1024 | シミュ解像度 |
| Outputresolution | 1024 | 128-4096 | 表示解像度 |

### Post ページ
| Param | Default | 範囲 | 役割 |
|---|---|---|---|
| Postcontrast | 0.7 | 0.0001-5 | 後処理ガンマ |
| Postbrightness | 1.0 | 0-5 | 後処理明るさ |
| Blurspread | 0.5 | 0-5 | 4-tapブラー広がり |

## 使い方

```python
# 外部から参照
caustics = op('/project1/causticsRig2').op('OUT_PUBLIC')
# パラメータ変更
op('/project1/causticsRig2').par.Density = 1.5
```

外部 CHOP (lfoCHOP等) を Custom Parameter に bind すれば動的アニメ可能。
