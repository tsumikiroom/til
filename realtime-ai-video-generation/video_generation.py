import os
import subprocess
import cv2
from pathlib import Path


class VideoGenerator:
    def __init__(self, output_dir="output"):
        self.output_dir = output_dir

    def create_video_from_frames(self, frame_pattern="generated_*.jpg", output_filename="output.mp4", fps=15):
        output_path = os.path.join(self.output_dir, output_filename)
        cmd = [
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-pattern_type", "glob",
            "-i", os.path.join(self.output_dir, frame_pattern),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-pix_fmt", "yuv420p",
            output_path,
        ]
        print(f"Creating video: {output_path} @ {fps}fps")
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"Video created: {output_path}")
            return output_path
        else:
            print(f"ffmpeg glob not supported, falling back to OpenCV...")
            return self.create_video_with_opencv(fps=fps)

    def create_video_with_opencv(self, output_filename="output.mp4", fps=15):
        frame_files = sorted(
            f for f in os.listdir(self.output_dir)
            if f.startswith("generated_") and f.endswith(".jpg")
        )
        if not frame_files:
            print("No generated frames found")
            return None

        first = cv2.imread(os.path.join(self.output_dir, frame_files[0]))
        h, w = first.shape[:2]
        output_path = os.path.join(self.output_dir, output_filename)
        out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))

        for f in frame_files:
            frame = cv2.imread(os.path.join(self.output_dir, f))
            out.write(frame)

        out.release()
        print(f"Video created: {output_path}")
        return output_path


if __name__ == "__main__":
    VideoGenerator("output").create_video_from_frames(fps=12)
