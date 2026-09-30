# フィールドレコーディング × AI アンビエント

楽器演奏ができない前提で、自分で録った環境音・声・物音などの素材を起点に AI で楽曲を作るワークフロー。

## 基本コンセプト

**人間 = 素材集めとアレンジ判断、AI = 音楽的展開**

楽器ができないことはアンビエント領域では弱点にならない。Brian Eno, Tim Hecker, William Basinski など、アンビエントの大家自身が「素材 + プロセス」で曲を作っている。AI 音楽生成 (Suno/Udio の Audio Upload) はその系譜を 1 人で実行可能にする道具。

## 使うサービスの選択

| 用途 | 推奨 |
|------|------|
| まず試す | **Suno Free** (Audio Upload が無料で 6〜60 秒試せる) |
| アンビエント本気で作る | **Udio Standard 以上** (アンビエント表現力 + Remix 機能) |
| 自分の声を歌に変換 | **Suno Pro** (Voices 機能、v5.5〜) |

詳細は [../services/suno-overview.md](../services/suno-overview.md) と [../services/udio-overview.md](../services/udio-overview.md) を参照。

## 4 つの典型ワークフロー

### 1. レイヤー積み上げ型 (Brian Eno 系)

**手法**: 環境音を起点に AI でテクスチャを薄く重ねていく

```
[フィールドレコーディング 30秒]
  ↓ アップロード
[Suno/Udio で Extend]
  ↓ 「素材を尊重しつつ薄くパッドを重ねる」と指示
[生成 1: 素材 + パッド]
  ↓ さらに Extend or DAW で別素材を重ねる
[生成 2: ...]
```

**プロンプト例:**
```
Ambient extension of the uploaded field recording.
Add a subtle Juno-106 pad in the background, very quiet, just to support the texture.
Preserve the original sound, do not overpower it.
60 BPM, no rhythm, no vocals.
```

### 2. 起点拡張型 (Tim Hecker / William Basinski 系)

**手法**: 短い素材 (声の断片、物音 1 つ) をループ・引き延ばして長尺ドローンに変成

```
[短い素材 5〜15秒 (例: グラスを指で弾く音)]
  ↓ アップロード
[Extend で前後を引き延ばす]
  ↓ 「素材の質感を保ったまま、変化は極めて遅く」と指示
[長尺のドローン的アンビエント]
```

**プロンプト例:**
```
Drone Ambient based on the uploaded sound.
Stretch and sustain the texture of the source.
Slow modular synth tones in the same frequency range.
Glacial pace, no rhythm, no melody, no vocals.
Long form, 5+ minutes.
```

### 3. Remix 型 (Udio 限定)

**手法**: 素材を「スタイル参照」にして、似た雰囲気の別バージョンを大量生成

```
[素材アップロード]
  ↓ Remix モード
[Udio が素材の質感を解析]
  ↓ 多数バリエーション生成
[気に入ったものを選別]
```

**用途**: 1 つの素材から「同じ世界観の別の曲」を作りたいとき、または素材自体は使わず質感だけ借りたいとき。

### 4. 素材コラージュ型 (William Basinski "Disintegration Loops" 系)

**手法**: 複数の素材を AI で別々に拡張 → DAW で重ねて編集

```
[素材 A: 雨音] → Extend → A 拡張版
[素材 B: 自分の声] → Extend → B 拡張版
[素材 C: 楽器の代用音 (鍋を叩く等)] → Extend → C 拡張版
   ↓
[DAW (Audacity / Reaper / Ableton 等) で重ねる]
[クロスフェード、ボリュームオートメーション、エフェクト処理]
```

AI 単体では不可能、外部ツール (DAW) が必要。最も手間がかかるが最も独自性が出る。

## 素材集めのチェックリスト

楽器がなくても以下から無限に集まる。

### 自分の声

- **囁き、呼吸**: マイクに近づけて録る
- **ハミング、鼻歌**: 旋律性は薄くてよい、音色として
- **無意味な音節** ("aaaah", "mmmm", "sss")
- **笑い、咳、ため息**
- **複数回録音して重ねる**: 同じ「あー」を 10 回録って重ねると合唱になる

### 環境音

- **雨**: 窓辺、傘の上、軒下、それぞれ質感が違う
- **風**: マイク直撃を避けて (ウィンドジャマー 代わりに靴下でも可)
- **交通**: 遠くの幹線道路、踏切、駅構内
- **室内**: 冷蔵庫、空調、PC ファン、時計の秒針、湯沸し
- **静寂**: 「無音」を 1 分録音すると部屋鳴りが残る、これがリバーブ素材になる

### 物の音

- **ガラス**: グラスを指で弾く、縁を濡れた指でこする
- **金属**: スプーンを叩く、ヘアピンを弾く、鍋蓋
- **紙**: 擦る、破る、丸める
- **水**: 注ぐ、滴る、洗面台
- **本、布**: ページめくり、シャツの擦れ

### 公共空間 (機材なしでも)

- **カフェ、駅、図書館の空気感**
- **遠くの音楽 (祭、街頭、車内 BGM)**
- **足音、扉の開閉**

注意: 公共空間の録音は人の会話が入る場合プライバシーに配慮 (公開時は識別不可能なほど加工する、または室内で完結させる)。

## 録音ツール (機材投資なしで)

- **スマートフォン**: 標準のボイスメモアプリで十分。最近のスマホは 24bit/48kHz 級
- **iOS**: GarageBand, Voice Memos
- **Android**: 標準のレコーダーアプリ、AudioRec
- **PC**: Audacity (無料、長年の定番)

**改善したくなったら**:
- Zoom H1n / H5 などのハンドヘルドレコーダー (1〜3 万円台)
- USB マイク (Blue Yeti, Audio-Technica AT2020USB+)

## 録音から AI 生成までの段取り

1. **録音** — スマホで気になる音を 30秒〜1分録る
2. **整音** — Audacity でノイズリダクション、無音区間カット、フェードイン/アウト
3. **保存** — [../recordings/](../recordings/) に命名規則に沿って保存
4. **アップロード** — Suno/Udio に素材アップロード
5. **生成** — Extend / Remix で AI 拡張
6. **保管** — 生成結果を [../archive/](../archive/) に保存、meta.md にプロンプトと素材ファイル名を記録
7. **(任意) 後処理** — DAW でレイヤー編集、エフェクト追加

## プロンプト設計のコツ (素材ありのとき)

通常の生成と違い、**「素材を尊重する」「素材を圧倒しない」と明示する**のが鍵。

詳細は [../prompting/prompt-design-basics.md](../prompting/prompt-design-basics.md) の「素材ありプロンプト」セクションを参照。

## 参考にしたい先人

- **Brian Eno** "Ambient 1: Music for Airports" — 環境音とテープループ
- **Tim Hecker** "Ravedeath, 1972" — オルガン録音 + ノイズ処理
- **William Basinski** "The Disintegration Loops" — テープループの自然崩壊
- **Hiroshi Yoshimura** "Music for Nine Post Cards" — 場所と音楽の融合
- **Susumu Yokota** "Sakura" — 自然音 + 静かなビート
- **Fennesz** "Endless Summer" — ギターをグリッチ処理

これらの作品を参考プロンプト (「in the style of」ではなく「reminiscent of warm, decaying tape ambient」のような形容詞で) に組み込むと方向性が出やすい。

詳しいジャンル知識は [../genres/ambient-electronica.md](../genres/ambient-electronica.md) を参照。

## TouchDesigner との接続

生成した素材ベースのアンビエントは、フィールドレコーディング由来のディテール (環境音的な粒立ち) が豊富なので、TouchDesigner で FFT 分解した時に**面白い周波数分布**を持つ。

詳細は [../touchdesigner-integration.md](../touchdesigner-integration.md) を参照。
