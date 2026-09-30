# 2026-05-22 セッション記録

## 達成内容

### 1. Unity → TouchDesigner 完全写経 (継続)
- `causticsRig2` baseCOMP に Unity アセットを1:1ポート
- compute shader 3本 (NoiseCS / RefractCS / ColorCS) + Mesh draw (Pass0) + Post (Pass1)
- 数値検証: Unity baseline mean=0.122 ↔ TD mean=0.124 (誤差 2%) 一致

### 2. Custom Parameters 追加
`causticsRig2` baseCOMP に2ページの Custom Pars:

**Caustics ページ:**
- Density (0.0〜10.0, default 1.0)
- Height (0.0〜10.0, default 1.0)
- Speed (0.0〜10.0, default 1.0)
- Flow (0.0〜5.0, default 0.25)
- Flowdirection (-360〜360, default -140)
- Refractionindex (1.0〜5.0, default 1.33)
- Brightness (0.0〜10.0, default 1.0)
- Gamma (0.0001〜5.0, default 1.0)
- Clamp (0.0〜10.0, default 1.0)
- **Calcresolution** (64〜1024, default 256)
- **Outputresolution** (128〜4096, default 1024)

**Post ページ:**
- Postcontrast (0.0001〜5.0, default 0.7)
- Postbrightness (0.0〜5.0, default 1.0)
- Blurspread (0.0〜5.0, default 0.5)

すべて内部ノードのuniformへ `parent().par.X` 式でバインド済み。

### 3. POP 版作成: `causticsRig2_POP`
- `causticsRig2` を複製
- **複製時の落とし穴を発見・修正:**
  - `noiseMap.array0/1/2chop` が SOP rig の sel_* CHOP を参照していた
  - `render.par.geometry / camera` が SOP rig の causticsGeo / cam を参照していた
  - `causticsMat.sampler0/1.top` も同様
  - 修正後、SOP/POP rigs は完全に独立して動作することを確認
- POP geometry (gridPOP + in/out POP) は GLSL MAT との相性問題 (texture coord 警告 + render=0) のため、現状は **内部geometryをSOPに戻して運用**
- POP化を本格的にやるには POP用 GLSL MAT のテンプレート研究が別途必要

## 未解決の問題

### Speed パラメータが効かない (本日最後)
**症状**: ユーザ視点で `Speed` を変えても波の動きが変わらない。

**取った対処と効果:**
1. `wave_state` スクリプトを `dt = now - last` の増分方式から `absTime.seconds * Speed` の絶対時刻方式に書き換え
   - これで `Speed` は `t_eff = absTime.seconds * Speed` の係数として直接効くはず
2. `Speed=0/1/5` での出力差は確認 (Python直接呼び出しでは差が出る)
3. しかし TD viewer 内で実時間動作させると波が動いていない

**仮説:**
- `wave_state` (Script CHOP) が**毎フレーム cookされていない** 可能性
  - Script CHOPは入力がない場合、 downstream からのpull要求がないと cook されない
  - `sel_data` CHOP → `noiseMap` の array uniform 経由で pull されるはずだが、
    GLSL TOP の array は値が変化したと検出しないと再cookを連鎖しない可能性
- TimerCHOP を入力に繋ぐと time-slice モードでcook強制できるが、
  - その場合 `scriptOp.numSamples` 編集不可になる
  - `scriptOp.isTimeSlice = False` で回避したが、 timer自体が auto-start していない

### Custom Param 制限値の落とし穴
- `clampMin=True / clampMax=True` を有効にすると **par.min / par.max** が clampする
- `appendFloat` のデフォルト min/max が 0〜1 のため、 normMax=3 でも実値は1.0でclampされる
- 全Custom Parsで `min=0, max=10` 等に明示設定して回避済み

## 復帰時の最優先タスク: Speed問題の解決

### 案A: chopExecuteDAT で毎フレーム wave_state を強制cook
- `chopExecuteDAT` を作って `onValueChange` で wave_state.cook(force=True) を呼ぶ
- 確実だが手数が多い

### 案B: wave_state を Script CHOP ではなく **GLSL TOP compute**化
- noiseMap.cook 連鎖で確実に毎フレーム実行される
- ただし dict 状態保持はできなくなる (絶対時刻方式なら問題ない)

### 案C: 単に `cookalways=True` 相当を script CHOP に設定 (もし存在すれば)
- `mod outsideCook` 系のpar調査

### 案D: noiseMap のシェーダで `absTime.seconds` を直接読み込む方式へ
- wave_state script は要らなくなる
- すべての wave 計算を GLSL 内で行う (uniform で渡すのは projection params だけ)
- **最も筋がいい** — 写経主義に戻る (Unity の setConstantBuffer 相当を GLSL 内で実装)

おすすめは **案D**。 wave のステート計算自体を **GLSL Compute TOP 内で完結** させれば、cook 連鎖の問題は消える。

## 主要ファイル
- TDプロジェクト: `Caustics_v1.2.toe`
- 主実装: `/project1/causticsRig2/` (SOP版・推奨)
- 複製: `/project1/causticsRig2_POP/` (内部はSOPに戻ってる)
- 旧実装バックアップ: `/project1/causticsRig_bak/`
- 完全コピー仕様書: `research/unity-port-spec.md`
- 最終結果ドキュメント: `research/final-port-result.md`

## 復帰時最初のチェック

1. TouchDesigner で `Caustics_v1.2.toe` を開く
2. `causticsRig2` の Custom Parameter `Speed` をスライダーで動かす
3. 波が動くか目視確認
4. 動かなければ案D (wave 計算をGLSL内に移動) に着手
