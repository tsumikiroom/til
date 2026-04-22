# リアルタイムAI動画生成 実装ガイド

## 概要

ウェブカメラからのリアルタイム入力を AI 画像生成モデル（FLUX.2 [klein] など）で処理し、生成された画像をシーケンシャルに繋ぎ合わせて動画を作成するシステム。

**インスピレーション**: [hirokazu_yokohara - Instagram Post](https://www.instagram.com/p/DW_CsAdEUVN/)

---

## システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    リアルタイムAI動画生成                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  入力           処理              出力                         │
│  ┌──────┐      ┌──────┐         ┌──────┐                    │
│  │Webcam├─────→│ FLUX │────────→│MP4 / │                   │
│  │Input │      │ 2    │ AI生成  │Display                   │
│  └──────┘      │Klein │         └──────┘                    │
│                └──────┘                                       │
│                  ↓                                             │
│              • レイテンシー: ~5-10秒/フレーム                │
│              • FPS: 6-20+ FPS（設定依存）                   │
│              • 推論方式: クラウド/ローカルGPU              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## システム要件

### ハードウェア

#### クラウド API 使用時（推奨スタート）
- インターネット接続（安定した回線）
- CPU: 4コア以上
- RAM: 8GB 以上
- ストレージ: 10GB 以上（動画キャッシュ用）

#### ローカル GPU 推論
- **GPU**: RTX 4070 以上（推奨）
  - VRAM: 12GB 以上（FLUX.2 [klein] 9B版の場合は19.6GB、4B版は8.4GB）
- **CPU**: Ryzen 5 5600X / Intel i7-12700K 相当
- **RAM**: 32GB 以上
- **ストレージ**: SSD 20GB 以上

### ソフトウェア

```yaml
Python: 3.11+
主要ライブラリ:
  opencv-python: 4.8+
  numpy: 1.24+
  pillow: 10+
  torch: 2.0+ (ローカル推論時)
  torchvision: 0.15+
  
API/サービス:
  Replicate: https://replicate.com (クラウド推論)
  HuggingFace: https://huggingface.co (代替)
  
動画処理:
  ffmpeg: 6.0+ (システムパッケージ)
```

---

## セットアップ手順

### 1. プロジェクトディレクトリ作成

```bash
mkdir realtime-ai-video-generation
cd realtime-ai-video-generation
```

### 2. Python 仮想環境

```bash
# venv を作成
python -m venv venv

# アクティベート（Windows）
.\venv\Scripts\Activate.ps1

# アクティベート（macOS/Linux）
source venv/bin/activate
```

### 3. 依存ライブラリインストール

#### オプション A: クラウド推論（Replicate）
```bash
pip install opencv-python replicate pillow numpy
pip install ffmpeg-python  # 動画生成
```

#### オプション B: ローカル GPU 推論
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
pip install diffusers transformers safetensors
pip install opencv-python pillow numpy ffmpeg-python
```

### 4. 外部ツール

#### ffmpeg インストール

**Windows (PowerShell)**
```powershell
# Chocolatey 使用
choco install ffmpeg

# または scoop
scoop install ffmpeg
```

**macOS**
```bash
brew install ffmpeg
```

**Linux (Ubuntu)**
```bash
sudo apt-get install ffmpeg
```

### 5. API 認証設定

#### Replicate API（クラウド推論推奨）
```bash
# 環境変数を設定
# Windows PowerShell
$env:REPLICATE_API_TOKEN = "your-api-token-here"

# macOS/Linux
export REPLICATE_API_TOKEN="your-api-token-here"

# .env ファイルで管理（推奨）
# .env ファイルを作成
echo "REPLICATE_API_TOKEN=your-api-token-here" > .env
```

1. [Replicate.com](https://replicate.com) でアカウント作成
2. API トークン取得
3. 月額 $20 従量課金制で FLUX を利用可能

#### HuggingFace（代替）
```bash
pip install huggingface-hub
huggingface-cli login
```

---

## 実装ステップ

### ステップ 1: ウェブカメラ基本入力（MVP）

**ファイル**: `01_webcam_capture.py`

```python
import cv2
import os
from datetime import datetime

class WebcamCapture:
    def __init__(self, camera_id=0, fps=30):
        self.cap = cv2.VideoCapture(camera_id)
        self.fps = fps
        self.frame_count = 0
        
        # ウェブカメラの解像度設定
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, fps)
        
    def capture_frame(self):
        ret, frame = self.cap.read()
        if ret:
            self.frame_count += 1
            return frame
        return None
    
    def save_frame(self, frame, output_dir="frames"):
        os.makedirs(output_dir, exist_ok=True)
        filename = f"{output_dir}/frame_{self.frame_count:06d}.jpg"
        cv2.imwrite(filename, frame)
        return filename
    
    def display_frame(self, frame):
        cv2.imshow("Webcam Input", frame)
        key = cv2.waitKey(1)
        return key != ord('q')
    
    def release(self):
        self.cap.release()
        cv2.destroyAllWindows()

# 使用例
if __name__ == "__main__":
    capture = WebcamCapture(fps=15)
    
    try:
        while True:
            frame = capture.capture_frame()
            if frame is None:
                break
            
            # フレームを保存
            capture.save_frame(frame)
            
            # フレームを表示
            if not capture.display_frame(frame):
                break
    finally:
        capture.release()
```

**実行**:
```bash
python 01_webcam_capture.py
```

### ステップ 2: Replicate API での画像生成

**ファイル**: `02_ai_image_generation.py`

```python
import replicate
import io
import os
import time
import requests
from PIL import Image

class FluxImageGenerator:
    def __init__(self, api_token=None):
        if api_token:
            os.environ["REPLICATE_API_TOKEN"] = api_token
    
    def generate_from_image(self, input_image_path, prompt="", strength=0.8):
        """
        FLUX.2-klein を使用して画像を生成
        
        Args:
            input_image_path: 入力画像パス
            prompt: 生成プロンプト
            strength: 入力画像への忠実度（0-1、1に近いほど元画像に近い）
        
        Returns:
            生成された PIL Image オブジェクト
        """
        with open(input_image_path, "rb") as img_file:
            output = replicate.run(
                "black-forest-labs/flux-dev",  # または "flux-schnell"（高速・低品質）
                input={
                    "image": img_file,
                    "prompt": prompt,
                    "strength": strength,
                }
            )
        
        if isinstance(output, list):
            generated_url = output[0]
        else:
            generated_url = output
        
        # URL から画像をダウンロード
        response = requests.get(generated_url)
        generated_image = Image.open(io.BytesIO(response.content))
        return generated_image
    
    def generate_from_prompt(self, prompt):
        """
        テキストプロンプトから直接画像生成
        """
        output = replicate.run(
            "black-forest-labs/flux-dev",
            input={
                "prompt": prompt,
            }
        )
        
        if isinstance(output, list):
            generated_url = output[0]
        else:
            generated_url = output
        
        import requests
        response = requests.get(generated_url)
        generated_image = Image.open(io.BytesIO(response.content))
        return generated_image

# 使用例
if __name__ == "__main__":
    generator = FluxImageGenerator()
    
    # テスト: 入力画像から生成
    image = generator.generate_from_image(
        "frames/frame_000001.jpg",
        prompt="vibrant digital art style"
    )
    image.save("output/generated_001.jpg")
    print("Generated: output/generated_001.jpg")
```

### ステップ 3: フレーム処理パイプライン

**ファイル**: `03_frame_pipeline.py`

```python
import cv2
import replicate
import io
import os
import time
from datetime import datetime
from PIL import Image
import numpy as np
import requests
from pathlib import Path

class FramePipeline:
    def __init__(self, 
                 output_dir="pipeline_output",
                 api_token=None,
                 fps=15,
                 interval_frames=2):
        """
        Args:
            output_dir: 出力ディレクトリ
            api_token: Replicate API トークン
            fps: キャプチャFPS
            interval_frames: 何フレーム毎に AI 生成するか（レイテンシー対策）
        """
        self.output_dir = output_dir
        self.interval_frames = interval_frames
        self.fps = fps
        Path(output_dir).mkdir(exist_ok=True)
        
        if api_token:
            os.environ["REPLICATE_API_TOKEN"] = api_token
    
    def capture_and_process(self, 
                            camera_id=0, 
                            prompt="",
                            duration_sec=30):
        """
        ウェブカメラからキャプチャ → AI生成 → 保存
        """
        cap = cv2.VideoCapture(camera_id)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        frame_count = 0
        generated_count = 0
        start_time = time.time()
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                elapsed = time.time() - start_time
                
                # タイムアウト
                if elapsed > duration_sec:
                    print(f"Finished after {duration_sec}s")
                    break
                
                # 入力フレームを保存
                input_path = f"{self.output_dir}/input_{frame_count:06d}.jpg"
                cv2.imwrite(input_path, frame)
                
                # interval_frames 毎に AI 生成
                if frame_count % self.interval_frames == 0:
                    print(f"[{frame_count}] Generating AI image...")
                    
                    try:
                        # Replicate で画像生成
                        with open(input_path, "rb") as img_file:
                            output = replicate.run(
                                "black-forest-labs/flux-dev",
                                input={"image": img_file, "prompt": prompt}
                            )
                        
                        generated_url = output[0] if isinstance(output, list) else output
                        
                        # ダウンロードして保存
                        response = requests.get(generated_url)
                        generated_image = Image.open(io.BytesIO(response.content))
                        output_path = f"{self.output_dir}/generated_{generated_count:06d}.jpg"
                        generated_image.save(output_path)
                        generated_count += 1
                        print(f"  → Saved: {output_path}")
                        
                    except Exception as e:
                        print(f"  Error: {e}")
                
                # リアルタイム表示
                cv2.imshow("Webcam Feed", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
        
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print(f"Captured: {frame_count} frames")
            print(f"Generated: {generated_count} AI images")
```

### ステップ 4: 動画生成

**ファイル**: `04_video_generation.py`

```python
import os
import subprocess
from pathlib import Path
import cv2

class VideoGenerator:
    def __init__(self, output_dir="pipeline_output"):
        self.output_dir = output_dir
    
    def create_video_from_frames(self, 
                                  frame_pattern="generated_*.jpg",
                                  output_filename="output.mp4",
                                  fps=15):
        """
        フレーム画像から MP4 動画を生成
        
        Args:
            frame_pattern: フレームのグロブパターン
            output_filename: 出力MP4ファイル名
            fps: フレームレート
        """
        frame_dir = self.output_dir
        output_path = os.path.join(self.output_dir, output_filename)
        
        # ffmpeg コマンド
        cmd = [
            "ffmpeg",
            "-framerate", str(fps),
            "-pattern_type", "glob",
            "-i", os.path.join(frame_dir, frame_pattern),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            output_path
        ]
        
        print(f"Creating video: {output_path}")
        print(f"FPS: {fps}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✓ Video created: {output_path}")
            return output_path
        else:
            print(f"✗ Error: {result.stderr}")
            return None
    
    def create_video_with_opencv(self, frame_dir, output_filename, fps=15):
        """
        OpenCV を使用した動画生成（代替方法）
        """
        frame_files = sorted([f for f in os.listdir(frame_dir) if f.endswith('.jpg')])
        
        if not frame_files:
            print("No frames found")
            return None
        
        first_frame = cv2.imread(os.path.join(frame_dir, frame_files[0]))
        h, w = first_frame.shape[:2]
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_filename, fourcc, fps, (w, h))
        
        for frame_file in frame_files:
            frame = cv2.imread(os.path.join(frame_dir, frame_file))
            out.write(frame)
        
        out.release()
        print(f"✓ Video created: {output_filename}")
        return output_filename

# 使用例
if __name__ == "__main__":
    generator = VideoGenerator("pipeline_output")
    generator.create_video_from_frames(
        frame_pattern="generated_*.jpg",
        output_filename="ai_video_output.mp4",
        fps=12
    )
```

### ステップ 5: 統合実行スクリプト

**ファイル**: `main.py`

```python
import argparse
import os
from pathlib import Path
from dotenv import load_dotenv

# ステップのモジュールをインポート
from webcam_capture import WebcamCapture
from frame_pipeline import FramePipeline
from video_generation import VideoGenerator

# .env ファイルから環境変数をロード
load_dotenv()

def run_realtime_generation(
    duration_sec=30,
    prompt="vibrant digital art",
    fps=15,
    interval_frames=2,
    output_dir="output"
):
    """
    ウェブカメラ入力から AI 動画生成まで一括実行
    """
    print("=" * 60)
    print("🎬 リアルタイムAI動画生成パイプライン")
    print("=" * 60)
    
    Path(output_dir).mkdir(exist_ok=True)
    
    # ステップ 1: ウェブカメラキャプチャ + AI生成
    print("\n[1/3] ウェブカメラキャプチャ + AI生成を開始...")
    pipeline = FramePipeline(
        output_dir=output_dir,
        fps=fps,
        interval_frames=interval_frames
    )
    
    pipeline.capture_and_process(
        camera_id=0,
        prompt=prompt,
        duration_sec=duration_sec
    )
    
    # ステップ 2: 動画生成
    print("\n[2/3] MP4 動画を生成中...")
    video_gen = VideoGenerator(output_dir)
    video_path = video_gen.create_video_from_frames(
        frame_pattern="generated_*.jpg",
        output_filename="ai_video_output.mp4",
        fps=12
    )
    
    print("\n[3/3] 完了")
    print("=" * 60)
    print(f"✓ 出力ファイル: {video_path}")
    print("=" * 60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="リアルタイムAI動画生成"
    )
    parser.add_argument(
        "--duration", 
        type=int, 
        default=30,
        help="キャプチャ時間（秒）"
    )
    parser.add_argument(
        "--prompt",
        type=str,
        default="vibrant digital art style, flowing colors",
        help="AI生成プロンプト"
    )
    parser.add_argument(
        "--fps",
        type=int,
        default=15,
        help="キャプチャFPS"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=2,
        help="AI生成を実行するフレーム間隔"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="output",
        help="出力ディレクトリ"
    )
    
    args = parser.parse_args()
    
    run_realtime_generation(
        duration_sec=args.duration,
        prompt=args.prompt,
        fps=args.fps,
        interval_frames=args.interval,
        output_dir=args.output
    )
```

**実行**:
```bash
python main.py --duration 30 --prompt "underwater city with neon lights"
```

---

## トラブルシューティング

### ウェブカメラが認識されない

```python
# カメラを列挙
import cv2

for i in range(5):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        print(f"Camera {i} is available")
        cap.release()
```

### Replicate API がタイムアウト

- API キーが正しいか確認
- ネットワーク接続を確認
- API レート制限を確認（月額プランの確認）
- タイムアウト時間を増やす

### ffmpeg が見つからない

```bash
# Windows
choco install ffmpeg --force

# 確認
ffmpeg -version
```

### メモリ不足エラー

- フレームサイズを減らす（640x480）
- interval_frames を増やす
- ローカル推論の場合は GPU メモリを確認

### 生成フレームのアスペクト比がおかしい

Replicate の FLUX モデルが画像をリサイズしている可能性がある。出力画像を元のアスペクト比に調整：

```python
from PIL import Image

def resize_to_match(generated_image, target_size=(640, 480)):
    return generated_image.resize(target_size, Image.Resampling.LANCZOS)
```

---

## パフォーマンス最適化

### フレームレート調整

| 設定 | FPS | 推論時間 | 品質 | 用途 |
|------|-----|---------|------|------|
| 低 | 6-8 | 7-10秒 | ⭐⭐⭐⭐⭐ | 高品質出力 |
| 中 | 12-15 | 3-5秒 | ⭐⭐⭐⭐ | バランス |
| 高 | 20+ | <2秒 | ⭐⭐⭐ | リアルタイム感重視 |

### メモリ最適化

```python
# フレーム保存時にメモリ節約
import gc

# 不要なフレームを削除
gc.collect()

# 古いフレームを定期的に削除
if frame_count > 100:
    os.remove(f"frames/frame_{frame_count-100:06d}.jpg")
```

---

## 次のステップ

1. **条件付き生成**: 動きの多いフレームのみ生成
2. **プロンプト自動生成**: フレームの内容から自動プロンプト生成
3. **ローカル推論**: FLUX をローカルで実行（GPU必須）
4. **リアルタイムストリーミング**: RTMP 配信対応
5. **GUI アプリケーション**: tkinter や PyQt で UI 化

---

## 参考資料

- [Replicate - FLUX Models](https://replicate.com/black-forest-labs)
- [OpenCV Python Guide](https://docs.opencv.org/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [PyTorch Installation](https://pytorch.org/)
- [HuggingFace Diffusers](https://huggingface.co/docs/diffusers)

---

## ライセンス・注記

- FLUX.2 は Black Forest Labs によって開発
- 個人利用: Replicate での従量課金
- 商用利用: ライセンス確認が必要
