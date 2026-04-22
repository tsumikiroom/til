# リアルタイムAI動画生成

ウェブカメラからのリアルタイム入力を AI 画像生成モデル（FLUX.2 [klein] など）で処理し、生成された画像をシーケンシャルに繋ぎ合わせて動画を作成するプロジェクト。

## 📚 クイックスタート

### 1. リポジトリのクローン・セットアップ

```bash
cd realtime-ai-video-generation
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
# または
source venv/bin/activate      # macOS/Linux
```

### 2. 依存ライブラリのインストール

**クラウド推論（推奨）**:
```bash
pip install -r requirements.txt
```

**ローカルGPU推論**:
```bash
pip install -r requirements-gpu.txt
```

### 3. 環境変数設定

```bash
# .env ファイルを作成
cp .env.example .env

# テキストエディタで API トークンを設定
# .env ファイルを編集して REPLICATE_API_TOKEN を入力
```

### 4. 実行

```bash
# デフォルト設定で実行（30秒間キャプチャ）
python main.py

# カスタム設定で実行
python main.py --duration 60 --prompt "abstract digital art" --fps 15
```

## 📖 詳細ドキュメント

- **[implementation-guide.md](./implementation-guide.md)**: 完全な実装ガイド
  - システムアーキテクチャ
  - セットアップ手順
  - 5段階の実装ステップ
  - トラブルシューティング

## 🏗️ プロジェクト構成

```
realtime-ai-video-generation/
├── implementation-guide.md     # 詳細な実装ガイド
├── README.md                   # このファイル
├── requirements.txt            # クラウド推論用依存ライブラリ
├── requirements-gpu.txt        # GPU推論用依存ライブラリ
├── .env.example               # 環境変数テンプレート
│
├── main.py                    # メインスクリプト（統合実行）
├── webcam_capture.py          # ウェブカメラキャプチャ
├── frame_pipeline.py          # フレーム処理パイプライン
├── video_generation.py        # MP4動画生成
│
└── output/                    # 出力ディレクトリ（自動作成）
    ├── input_*.jpg            # 入力フレーム
    ├── generated_*.jpg        # 生成フレーム
    └── ai_video_output.mp4    # 最終出力動画
```

## ⚙️ システム要件

### クラウド推論（Replicate）
- **推奨**: インターネット接続
- **CPU**: 4コア+
- **RAM**: 8GB+
- **API**: Replicate アカウント（月額 $20 従量課金）

### ローカルGPU推論
- **GPU**: RTX 4070 以上（FLUX.2 [klein] 4B版: 8.4GB VRAM、9B版: 19.6GB VRAM）
- **CPU**: Ryzen 5 5600X 相当
- **RAM**: 32GB+

## 🚀 使用方法

### 基本的な実行

```bash
python main.py --duration 30 --prompt "vibrant digital art"
```

### オプション一覧

| オプション | デフォルト | 説明 |
|-----------|----------|------|
| `--duration` | 30 | キャプチャ時間（秒） |
| `--prompt` | "vibrant digital art style" | AI生成プロンプト |
| `--fps` | 15 | キャプチャFPS |
| `--interval` | 2 | AI生成フレーム間隔 |
| `--output` | "output" | 出力ディレクトリ |

## 📊 パフォーマンス見積もり

| 設定 | 推論時間 | FPS | 品質 |
|------|---------|-----|------|
| 低速（高品質） | 7-10秒/フレーム | 6-8 | ⭐⭐⭐⭐⭐ |
| 中速 | 3-5秒/フレーム | 12-15 | ⭐⭐⭐⭐ |
| 高速（低品質） | <2秒/フレーム | 20+ | ⭐⭐⭐ |

## 🔧 トラブルシューティング

### ウェブカメラが認識されない

```python
import cv2
for i in range(5):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        print(f"Camera {i} is available")
        cap.release()
```

### Replicate API エラー

1. API トークンが正しいか確認
2. ネットワーク接続を確認
3. 月額プラン残高を確認

### ffmpeg が見つからない

**Windows**:
```powershell
choco install ffmpeg
```

**macOS**:
```bash
brew install ffmpeg
```

詳細は [implementation-guide.md](./implementation-guide.md#トラブルシューティング) を参照。

## 📚 参考リンク

- [Replicate - FLUX Models](https://replicate.com/black-forest-labs)
- [OpenCV Documentation](https://docs.opencv.org/)
- [FFmpeg Guide](https://ffmpeg.org/documentation.html)
- [Instagram インスピレーション](https://www.instagram.com/p/DW_CsAdEUVN/)

## 🎯 次のステップ

1. **条件付き生成**: 高コントラストフレームのみ処理
2. **スマートプロンプト**: 前フレームから自動プロンプト生成
3. **リアルタイムストリーミング**: Twitch/YouTube Live 対応
4. **GUI**: PyQt/tkinter でのビジュアルコントローラー
5. **ローカル推論**: FLUX をローカルで実行

## 📝 ライセンス

このプロジェクトは MIT ライセンス下で公開されています。

**注記**: FLUX.2 は Black Forest Labs によって開発されています。商用利用時はライセンス確認が必要です。

---

**作成日**: 2026年4月22日  
**最終更新**: 2026年4月22日
