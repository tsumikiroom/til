# Ripples

水面の波紋を **波動方程式** で物理シミュレーションするシステム。
指定した位置から波紋を発生させ、 複数の波紋が物理的に正しく干渉する。

## ファイル

| Path | 内容 |
|---|---|
| `ripples.toe` | 本体 |
| `research/ripple-spec.md` | 実装仕様書 (作業中) |

## 構成 (予定)

```
/project1/rippleRig (baseCOMP)
├── trigger_panel    (containerCOMP)    ← マウスクリック検知
├── click_exec       (panelExecuteDAT)  ← クリック座標を impulse_chop へ
├── impulse_chop     (scriptCHOP)       ← インパルスの位置+強度を出力
├── impulse_tex      (compute GLSL TOP) ← クリック点を 1フレ ガウシアン描画
├── waveSim          (GLSL TOP feedback)← 波動方程式 solver
├── normalMap        (GLSL TOP)         ← 高さ → 法線
├── post             (GLSL TOP)         ← 表示調整
└── OUT_PUBLIC       (Out TOP)
```

## 波動方程式

```
u(x,y,t+1) = 2u(x,y,t) - u(x,y,t-1) + c²·∇²u(x,y,t) - damping
```

feedback TOP で前々フレ・前フレを保持し、 GLSL で次フレを計算。

## Custom Parameters (予定)

### Simulation
- `Wavespeed` (0-2) 波速 (大きいほど早く伝わる)
- `Damping` (0.9-1.0) 1フレあたりの減衰
- `Impulsestrength` (0-5) クリック1回の力
- `Impulseradius` (1-30 px) クリック点のガウシアン半径
- `Boundary` (reflect/absorb/wrap) 境界条件

### Display
- `Calcresolution` (128-2048) シミュ解像度
- `Outputresolution` (256-4096) 表示解像度
- `Postcontrast` / `Postbrightness`
- `Visualize` (height/normal/edge) 出力モード

### Trigger
- `Triggerchop` (CHOP) パーティクル等からの複数位置入力 (将来用)
- `Maxtriggers` (int) 同時トリガー数上限

## 状態: 完成

詳細仕様は [research/ripple-spec.md](research/ripple-spec.md) を参照。

ただし採用したアルゴリズムは **波動方程式 ではなく Shadertoy procedural 方式**:
- 物理的な反射は出ないが、 リング展開・leading edge強調・Schlick bias profile で非常に綺麗
- 干渉は線形加算による近似だが視覚的に十分

## 使い方

1. TouchDesigner で `ripples.toe` を開く
2. `/project1/rippleRig/trigger_panel` を Viewer で表示
3. その panel をクリックすると波紋が広がる

外部からの参照:
```python
ripple = op('/project1/rippleRig').op('OUT_PUBLIC')
op('/project1/rippleRig').par.Lifetime = 5.0   # 波紋を長持ちに
```

## 関連

- 完成後は `10_caustics/caustics.toe` の noiseMap 入力に流し込んで「**雨が水面で光のコースティクスに**」する応用が可能 (別タスク)
