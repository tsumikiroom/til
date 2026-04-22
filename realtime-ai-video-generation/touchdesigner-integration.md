# TouchDesigner 連携実装計画

## 概要

Python でリアルタイムに生成された AI フレーム画像を TouchDesigner でリアルタイム表示・処理するシステム。

**統合ポイント**: `output/generated_*.jpg` をファイル監視 → TouchDesigner で即座に表示

---

## システムアーキテクチャ

```
┌──────────────────────────────────────────────────────────────┐
│                Python リアルタイムAI画像生成                  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Webcam Input → FLUX.2 Inference → output/generated_*.jpg    │
│                                          ↓                     │
│                                    [File Monitor]             │
│                                          ↓                     │
└──────────────────────────────────────────────────────────────┘
                                           ↓
┌──────────────────────────────────────────────────────────────┐
│              TouchDesigner ファイル監視・表示                 │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  [file CHOP] → [TOP File] → [COPs] → [OUT]                  │
│   (watch dir)   (auto-reload) (effects)   (display)          │
│                                                                │
│  • リアルタイムプレビュー                                      │
│  • エフェクト処理（GLSLトップス）                             │
│  • 外部表示（プロジェクター等）                               │
│  • パラメーター制御（プロンプト、FPS調整）                   │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 実装方法の比較

| 方法 | 遅延 | 複雑度 | ネットワーク | 推奨度 |
|------|------|--------|------------|--------|
| **ファイル監視** | 中（ファイルI/O分） | ⭐ | 不要 | ⭐⭐⭐⭐ |
| **UDP/OSC** | 極低 | ⭐⭐⭐ | 必要 | ⭐⭐⭐ |
| **WebSocket** | 低 | ⭐⭐ | 必要 | ⭐⭐⭐ |
| **Syphon/Spout** | 極低（共有メモリ） | ⭐⭐ | 不要 | ⭐⭐⭐⭐⭐ |

> **注**: Spout（Windows）/Syphon（macOS）はGPUメモリを直接共有するためほぼゼロ遅延。ただしPythonからSpoutへ送るには `SpoutGL` ライブラリが必要。ファイル監視は設定が最も簡単なため、スタート地点として推奨。

---

## 推奨構成: ファイル監視方式

### A. Python 側の準備

#### 1. フレーム保存を最適化

**ファイル**: `frame_pipeline.py` の修正

```python
import cv2
import os
from pathlib import Path

class OptimizedFrameSaver:
    def __init__(self, output_dir="output", watch_dir="output/watch"):
        self.output_dir = output_dir
        self.watch_dir = watch_dir
        Path(watch_dir).mkdir(exist_ok=True)
    
    def save_frame_for_td(self, image, frame_num):
        """
        TouchDesigner 用フレーム保存（即座に反映）
        
        • 常に同じファイル名で上書き
        • 古いフレームは履歴保存
        """
        from PIL import Image
        
        # メイン出力（即座に表示用）
        watch_file = os.path.join(self.watch_dir, "current_frame.jpg")
        image.save(watch_file, quality=95)
        
        # 履歴保存（アーカイブ用）
        history_file = os.path.join(
            self.output_dir, 
            f"generated_{frame_num:06d}.jpg"
        )
        image.save(history_file, quality=95)
        
        print(f"Saved: {watch_file}")
```

#### 2. 生成パイプラインを修正

**main.py** で上書き保存方式を適用：

```python
# 既存の generate_from_image() 後に
generator.save_frame_for_td(generated_image, frame_count)
```

---

### B. TouchDesigner 側の実装

#### ステップ 1: Toe ファイル基本設定

**新規ファイル作成**: `AIVideoRealtimeDisplay.toe`

```
1. File > New
2. Project > Size: 1280 x 720
3. Project > FPS: 30
4. Project > Default Ops > OFF (不要な初期オプを削除)
```

#### ステップ 2: TOP File で画像ロード（ファイル監視の主体）

> **注**: 画像の監視・表示は `File TOP` が直接行う。`File CHOP` は数値データ読み込み用であり、画像監視には使わない。

**レイアウト**:

```
[File TOP]  ← output/watch/current_frame.jpg を監視・ロード
    ↓
[Null TOP]
    ↓
[Out TOP]
```

**File TOP 設定**:

```
ネットワークを右クリック > Add Operator > TOP > File

パラメーター設定:
  • File タブ > File: $(project:path)/output/watch/current_frame.jpg
  • File タブ > Re-load: Pulse（または Always）
  • Common タブ > Cook: On Demand
  • ※ Auto-Reload を有効にするには Reload ページで "Always" を選択
```

**Python から強制リロードする場合**:

```python
# TD Python スクリプト内
op('file1').par.reload.pulse()
```

#### ステップ 4: 出力設定

**Display TOP**:

```
File TOP
    ↓
[Null TOP]
    ↓
[Out TOP] ← Display
```

---

### C. TouchDesigner ネットワーク構築例

#### 最小限の実装（即座に見る）

```python
# TD 内の Python スクリプト（参考）
# output/watch/current_frame.jpg が常に最新フレーム

# ======================================
# TD ネットワーク構成
# ======================================

# 1. 画像ロード＆監視
op('file1')  # File TOP: output/watch/current_frame.jpg を監視・表示
op('null1')  # Null TOP: パスポイント

# 2. 出力
op('out1')   # Out TOP: 出力

# Python側でフレーム保存 → File TOP が自動検出・表示
# 必要に応じてリロードをパルス: op('file1').par.reload.pulse()
```

#### エフェクト付きの実装

```
[TOP File (current_frame)]
    ↓
[GLSL TOP: Edge Detection]
    ↓
[GLSL TOP: Color Correction]
    ↓
[Composite TOP: Blend]
    ↓
[Out TOP]
```

**GLSL フラグメントシェーダー例**:

```glsl
// エッジ検出（GLSL TOP 用）
out vec4 fragColor;

void main()
{
    vec4 c = texture(sTD2DInputs[0], vUV.st);
    
    // dFdx/dFdy でピクセル間の輝度勾配を計算
    float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    float edge = length(vec2(dFdx(lum), dFdy(lum)));
    
    fragColor = mix(c, vec4(vec3(edge), 1.0), 0.5);
}
```

> **注**: TDのGLSL TOPでは `uv` の代わりに `vUV.st`、テクスチャサンプラーは `sTD2DInputs[0]` を使う。`gradient()` はGLSLに存在しないので `dFdx`/`dFdy` で代替。

---

## 実装シナリオ別ガイド

### シナリオ 1: シンプル表示（推奨スタート）

**目標**: Python で生成 → TD でリアルタイム表示

**実装時間**: 5 分

**手順**:
1. Python: `main.py` を実行開始
2. TD: 新規プロジェクト作成
3. TD: `TOP File` を追加、ファイル指定
4. TD: `Auto-Reload` ON
5. TD: `Out TOP` に接続

**コード**:
```python
# Python
capture_and_process(duration_sec=120, interval_frames=2)
# → output/watch/current_frame.jpg が更新され続ける
```

```python
# TD 内の Python スクリプト（File TOP 設定例）
op('file1').par.file = "C:/path/output/watch/current_frame.jpg"
op('file1').par.reload.pulse()   # 手動リロード

# 自動リロードはパラメーターUI > Reload ページで "Always" に設定
# （Python からは op('file1').par.reloadmode = 'always' 相当）
op('out1').inputConnectors[0].connect(op('file1'))
```

---

### シナリオ 2: リアルタイムパラメーター制御

**目標**: TD から Python のプロンプトやフレームレート を制御

**実装時間**: 15 分

**TD → Python 通信: UDP/JSON**

**実装**:

```python
# Python: listen_from_td.py
import json
import socket
import queue
import threading

class TDController:
    def __init__(self, listen_port=9999):
        self.port = listen_port
        self.latest_config = {}
        self.start_listener()
    
    def start_listener(self):
        def listen():
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.bind(('127.0.0.1', self.port))
            
            while True:
                data, addr = sock.recvfrom(1024)
                try:
                    config = json.loads(data.decode('utf-8'))
                    self.latest_config = config
                    print(f"[TD] {config}")
                except:
                    pass
        
        thread = threading.Thread(target=listen, daemon=True)
        thread.start()
    
    def get_prompt(self, default="vibrant digital art"):
        return self.latest_config.get('prompt', default)
    
    def get_fps(self, default=15):
        return self.latest_config.get('fps', default)

# 使用例
controller = TDController()
# ...
prompt = controller.get_prompt()
fps = controller.get_fps()
```

**TouchDesigner側**:

```python
# TD Python CHOP
import json
import socket

def send_to_python():
    config = {
        'prompt': op('text1').val,
        'fps': int(op('slider1').val),
        'strength': op('slider2').val
    }
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.sendto(json.dumps(config).encode(), ('127.0.0.1', 9999))
    sock.close()

# UI から呼び出し
send_to_python()
```

---

### シナリオ 3: ネットワーク配信（Spout/Syphon）

**目標**: TD からの出力をプロジェクター/別PCに配信

**Spout 送信**（Windows）:

```
[file TOP]
    ↓
[Spout TOP] ← Enable, Name: "AIVideoStream"
    ↓
[Out TOP]
```

**受信側**:
- OBS で Spout をキャプチャ
- → 配信・外部プロジェクター出力

---

## TouchDesigner コンポーネント実装詳細

### Component 1: ファイルモニター

**パス**: `/viewer/file_monitor`

```
# オペレータ構成
[File TOP]
    パラメーター:
    - File タブ > File: $(project:path)/output/watch/current_frame.jpg
    - Reload ページ > Reload: Always（自動監視）
    - Common タブ > Resolution: Input（元解像度維持）
    
[Null TOP] → [Out TOP]
```

### Component 2: 画像プール（複数フレーム表示）

**パス**: `/viewer/frame_gallery`

```tscript
# 複数の TOP File を監視
for i in range(4):
    op(f'file{i}').par.File = f"$(project:path)/output/generated_{i:06d}.jpg"
```

### Component 3: パラメーターコントロールUI

**パス**: `/ui/controls`

```
[Text CHOP] → Prompt input
[Slider] → FPS control
[Slider] → Strength control
[Button] → Start/Stop
```

---

## トラブルシューティング

### ファイルが自動更新されない

**原因**: ファイルシステムのキャッシュ遅延

**解決**:
```python
# Python 側: 強制フラッシュ
import os
import time

file_path = "output/watch/current_frame.jpg"
image.save(file_path)

# バッファフラッシュ（ファイルを適切に閉じる）
with open(file_path, 'rb') as f:
    os.fsync(f.fileno())
time.sleep(0.01)
```

### TOP File が古いフレームを表示

**原因**: メモリキャッシュ

**解決**:
```python
# TD 側（Python スクリプト内）
# パラメーターUI で File TOP > Reload ページ > Reload: Always に設定する
# スクリプトから手動リロードをトリガーする場合:
op('file1').par.reload.pulse()
```

### UDP 通信が届かない

**原因**: ファイアウォール/ポート競合

**確認**:
```bash
# ポート確認（Windows PowerShell）
Get-NetUDPEndpoint | Select-Object LocalPort, State
```

---

## 推奨 Toe ファイル構成

```
AIVideoRealtimeDisplay.toe
├── /viewer
│   ├── /file_monitor
│   │   ├── file_top (TOP File)
│   │   ├── null_top
│   │   └── out_top
│   ├── /effects
│   │   ├── glsl_edge
│   │   ├── glsl_color
│   │   └── composite
│   └── /gallery
│       ├── file1 (frame history 1)
│       ├── file2
│       ├── file3
│       └── file4
├── /ui
│   ├── /controls
│   │   ├── prompt_text
│   │   ├── fps_slider
│   │   ├── strength_slider
│   │   └── start_button
│   └── /display
│       ├── text_info
│       └── meter_fps
└── /python
    ├── send_config  (TD → Python)
    └── listen_server (Python → TD)
```

---

## 実装チェックリスト

### フェーズ 1: 基本動作（1-2 日）

- [ ] Python `main.py` の `save_frame_for_td()` 実装
- [ ] `output/watch/current_frame.jpg` を常時更新確認
- [ ] TD で `TOP File` を追加
- [ ] ファイルパス指定
- [ ] `Auto-Reload` ON
- [ ] リアルタイム表示確認

### フェーズ 2: エフェクト追加（2-3 日）

- [ ] GLSL TOP フィルター追加
- [ ] カラー補正追加
- [ ] Composite TOP で複合処理
- [ ] プレビュー表示確認

### フェーズ 3: パラメーター制御（3-5 日）

- [ ] UDP リスナー実装（Python）
- [ ] UI スライダー実装（TD）
- [ ] プロンプト動的変更
- [ ] FPS 制御

### フェーズ 4: 配信対応（5-7 日）

- [ ] Spout/Syphon 設定
- [ ] OBS キャプチャ検証
- [ ] プロジェクター出力テスト
- [ ] ストリーミング配信テスト

---

## パフォーマンス最適化

### メモリ管理

```python
# Python: 古いフレーム削除
import os
from pathlib import Path

def cleanup_old_frames(output_dir, keep_count=20):
    files = sorted(Path(output_dir).glob("generated_*.jpg"))
    for f in files[:-keep_count]:
        f.unlink()  # 削除
```

### ファイルI/O最適化

```python
# JPEG 品質と速度のバランス
image.save(path, quality=90, optimize=False)  # optimize=False で高速化
```

### TD ネットワーク最適化

```tscript
# TOP の解像度制限
op('file1').par.Downsample = 1  # 1/2 に縮小
```

---

## 次のステップ

1. **基本実装**: ファイル監視方式で表示
2. **エフェクト**: GLSL で画像処理
3. **制御**: UDP で Python と通信
4. **配信**: Spout で外部出力
5. **GUI**: TD UI コンポーネントで操作パネル

---

## 参考ドキュメント

- [TouchDesigner Official Docs](https://docs.derivative.ca/)
- [Spout Documentation](http://spout.zeal.co/)
- [GLSL Reference](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language)

---

**作成日**: 2026年4月22日  
**対応**: TouchDesigner 2024.23480+
