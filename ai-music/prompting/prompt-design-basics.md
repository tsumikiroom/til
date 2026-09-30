# プロンプト設計の基本

Suno / Udio に渡すテキストプロンプトの組み立て方。アンビエント / エレクトロニカに寄せた語彙集を含む。

## 基本原則

1. **「Electronic」だけだと弱い** — サブジャンル名で具体化する (例: "Ambient Techno", "Drone Ambient", "IDM")
2. **音楽理論ではなく感覚で書く** — 「Cm 7th」より「メランコリックで残響の長い」
3. **楽器は character で指定** — 「electric piano」より「Rhodes piano with slow deep tremolo」
4. **テンポは vibe anchor** — BPM を入れると曲調が安定する
5. **除外指定が効く** — "No vocals, no drops, no build-ups" でポップ構造化を防ぐ

## プロンプトの 5 構成要素

| 要素 | 例 |
|------|-----|
| **ジャンル / サブジャンル** | "Ambient Techno", "Drone Ambient", "IDM", "Downtempo" |
| **雰囲気 / 形容詞** | "meditative", "melancholic", "spacious", "warm", "icy", "underwater" |
| **楽器 / 音色** | "Juno-106 pad", "tape echo", "field recording of rain", "granular synth" |
| **テンポ / 構造** | "60 BPM", "starts sparse, adds one element every 30 seconds" |
| **除外** | "No vocals", "no drums", "no build-up" |

## アンビエント / エレクトロニカ向け語彙集

### サブジャンル

- **Ambient** — Brian Eno 由来の静的・環境音楽
- **Drone Ambient** — 持続音中心、変化が極めて遅い
- **Dark Ambient** — 不穏・冷たい・空間的
- **Space Ambient** — 宇宙的、SF 的、浮遊感
- **Generative Ambient** — 自己進行的、反復しない
- **Ambient Techno** — 4 つ打ちはあるが瞑想的 (例: Aphex Twin "Selected Ambient Works")
- **IDM** (Intelligent Dance Music) — 複雑なビート、実験的 (例: Autechre, Aphex Twin)
- **Downtempo** — 60〜90 BPM、ビートはあるが緩い
- **Glitch / Microsound** — クリック、ノイズ、デジタル断片
- **Modular Synth Improvisation** — モジュラーシンセの即興

### 雰囲気を伝える形容詞

- 静謐: "ethereal", "serene", "meditative", "contemplative", "spacious"
- 暖かさ: "warm", "lush", "enveloping", "analog warmth"
- 冷たさ: "icy", "crystalline", "glacial", "sterile"
- 質感: "textured", "grainy", "hazy", "blurred", "shimmering"
- 場所: "underwater", "in a cathedral", "in deep space", "in a forest at dawn"

### 楽器・機材名 (character を持つもの)

シンセサイザー:
- **Juno-106 pad** — 80 年代アナログの定番、柔らかいパッド音
- **Prophet-5** — 暖かい、ヴィンテージアナログ
- **Moog** — 重厚なベース・リード
- **DX7** — デジタル FM、独特のベル音
- **Modular synth** — 不規則・実験的

その他:
- **Rhodes piano** — ジャジーな電気ピアノ
- **Mellotron** — テープ式、ノスタルジック
- **Granular synth** — 粒子状のテクスチャ
- **Tape echo / Space Echo** — 揺らぎのあるディレイ
- **Field recording** — 環境音 (雨、風、街、波)
- **Reversed piano** — 逆再生ピアノ

### テンポ目安 (アンビエント帯)

- **40〜60 BPM**: 完全に瞑想的、ほぼ静止
- **60〜70 BPM**: メディテーション帯
- **75〜85 BPM**: 集中・作業 BGM 帯 (Lo-fi, Downtempo)
- **90+ BPM**: アンビエントとしては速い、Ambient Techno 寄り

### 構造の指示 (展開を作る)

- "starts with a single drone, slowly introduces a piano motif at 1 minute"
- "sparse beginning, builds gradually for 2 minutes, then strips back to silence"
- "evolving texture with no clear sections"
- "loop-based, with subtle variations every 8 bars"

## プロンプト例

### 例 1: ピアノ + 環境音のアンビエント

```
Ambient piano, melancholic and spacious, with field recording of distant rain.
Slow Rhodes piano motifs, tape echo, long reverb tail.
60 BPM. Starts sparse, builds one element every 45 seconds.
No vocals, no drums.
```

### 例 2: ドローンアンビエント

```
Drone Ambient with Juno-106 pads and modular synth textures.
Glacial, slowly evolving harmonic clusters.
40 BPM, no rhythm. Cinematic and meditative.
No vocals, no percussion.
```

### 例 3: Ambient Techno (アタックは欲しい)

```
Ambient Techno in the style of Selected Ambient Works Volume II.
Soft, distant kick at 70 BPM, hazy synth pads, granular textures.
Crystalline atmosphere, no melody, no vocals.
Long form, evolving subtly over 5 minutes.
```

### 例 4: Space Ambient

```
Space Ambient. Vast, weightless, infinite.
Slow modular synth drones, warm analog pads, occasional sine wave bell.
No rhythm, no vocals. Cosmic and contemplative.
```

## 素材ありプロンプト (Audio Upload)

自分の録音素材を起点に AI 拡張する場合、プロンプトは通常と性格が変わる。**「素材を主役に据え、AI は脇役」**という指示が必要。

### 基本原則 (素材あり)

1. **素材を尊重する旨を明示** — "preserve the original", "do not overpower"
2. **AI が足すものを限定** — "add only a subtle pad", "minimal accompaniment"
3. **素材の質感を引き継がせる** — "extend the texture of the source"
4. **ボリュームバランスを指示** — "AI elements should sit far below the source"

### プロンプト例 (素材あり)

#### 環境音 (雨、風) を起点にした拡張

```
Ambient extension of the uploaded field recording.
Preserve the original sound as the foreground.
Add only a quiet, sustained synth pad in the background, barely audible.
60 BPM, no rhythm, no vocals, no melody.
Extend smoothly without introducing new sections.
```

#### 自分の声を素材にした拡張

```
Drone Ambient based on the uploaded vocal sample.
Stretch and resonate the texture of the voice, like a slow choir.
Add warm reverb, no clear pitch, no rhythm, no additional instruments.
Glacial pace, contemplative.
```

#### 物音 (グラス、金属) を起点にした拡張

```
Ambient texture built from the uploaded percussive sound.
Treat the original as a recurring motif, looped and pitched at intervals.
Layer subtle modular synth drones in the same frequency range.
40 BPM, no drums, no vocals, evolving slowly.
```

#### Udio Remix モード用 (素材の質感だけ借りる)

```
Create a piece in the same atmosphere as the uploaded audio.
Maintain the textural character (grainy / hazy / spacious / warm).
Same tempo, similar harmonic palette.
Ambient, no vocals.
```

### 素材ありで避けること

- **「素材を変形させて」と曖昧に書く** — 「主役か脇役か」が AI に伝わらないと意図しない結果になる
- **歌入り指示** — 素材アンビエントは基本インスト、明示的に "no vocals" を入れる
- **強いビート要求** — 素材の繊細さが潰れる
- **「AI が主役で素材は背景に」** が欲しい場合は **明示的に書く** (デフォルトでは AI は素材を尊重する傾向)

詳細なワークフローは [../workflows/field-recording-ambient.md](../workflows/field-recording-ambient.md) を参照。

## やらない方がよいこと

- **長すぎるプロンプト** — モデルが要素を混ぜきれず凡庸になる。150〜300 文字程度が扱いやすい
- **矛盾した指示** — "energetic and meditative" のような両立しない形容詞
- **音楽理論用語の多用** — "Modal interchange in Aeolian" などは効きづらい。情景・雰囲気の方が反応する
- **既存アーティスト名の直接コピー** — 著作権・利用規約の問題。"in the style of X" は許される場合もあるが、Suno は本人のアーティスト名を遮断する傾向
- **「いい曲」「美しい」「最高の」** — 抽象的すぎて効果ない

## 進化させ方

1. 最初は短めのプロンプトで生成
2. 気に入った要素 (シンセ音、雰囲気) があれば、その要素を強調した次のプロンプトを作る
3. うまくいったプロンプトは [archive/](../archive/) にメタデータと一緒に保存
4. 失敗パターンも記録 (「○○を入れたら歌が入った」など)

## 出典

- [Electronic Music & EDM Mastery (sunoprompt.com)](https://sunoprompt.com/music-style-genre/electronic-music-genre)
- [Ambient Music for AI Creation (sunoprompt.com)](https://sunoprompt.com/music-style-genre/ambient-music-genre)
- [Suno Prompts: 100+ Examples (musci.io)](https://musci.io/blog/suno-prompts)
- [Why Your Suno Songs Sound Generic (musicsmith.ai)](https://musicsmith.ai/blog/ai-music-generation-prompts-best-practices)
- [Suno Instrumental Prompts (hookgenius.app)](https://hookgenius.app/learn/suno-instrumental-prompts/)
