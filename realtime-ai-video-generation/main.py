import argparse
from pathlib import Path
from dotenv import load_dotenv

from frame_pipeline import FramePipeline
from video_generation import VideoGenerator

load_dotenv()


def run(duration_sec=30, prompt="vibrant digital art", fps=15, interval_frames=2, output_dir="output"):
    print("=" * 60)
    print("リアルタイムAI動画生成パイプライン")
    print("=" * 60)

    Path(output_dir).mkdir(exist_ok=True)

    print(f"\n[1/2] Webcam capture + AI generation ({duration_sec}s)...")
    pipeline = FramePipeline(output_dir=output_dir, fps=fps, interval_frames=interval_frames)
    generated = pipeline.capture_and_process(camera_id=0, prompt=prompt, duration_sec=duration_sec)

    if generated == 0:
        print("No frames generated. Exiting.")
        return

    print("\n[2/2] Generating MP4...")
    video_path = VideoGenerator(output_dir).create_video_from_frames(fps=12)

    print("\n" + "=" * 60)
    print(f"Done. Output: {video_path}")
    print(f"TD watch file: {output_dir}/watch/current_frame.jpg")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="リアルタイムAI動画生成")
    parser.add_argument("--duration", type=int, default=30, help="キャプチャ時間（秒）")
    parser.add_argument("--prompt", type=str, default="vibrant digital art style, flowing colors")
    parser.add_argument("--fps", type=int, default=15, help="キャプチャFPS")
    parser.add_argument("--interval", type=int, default=2, help="AI生成フレーム間隔")
    parser.add_argument("--output", type=str, default="output", help="出力ディレクトリ")
    args = parser.parse_args()

    run(
        duration_sec=args.duration,
        prompt=args.prompt,
        fps=args.fps,
        interval_frames=args.interval,
        output_dir=args.output,
    )
