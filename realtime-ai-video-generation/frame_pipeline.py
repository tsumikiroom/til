import cv2
import io
import json
import os
import socket
import threading
import time
import requests
import replicate
from pathlib import Path
from PIL import Image


class TDController:
    def __init__(self, port=9999):
        self._config = {}
        self._lock = threading.Lock()
        self._thread = threading.Thread(target=self._listen, args=(port,), daemon=True)
        self._thread.start()
        print(f"UDP listener started on port {port}")

    def _listen(self, port):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.bind(('127.0.0.1', port))
        while True:
            try:
                data, _ = sock.recvfrom(1024)
                config = json.loads(data.decode('utf-8'))
                with self._lock:
                    self._config = config
                print(f"[TD] {config}")
            except Exception:
                pass

    def get(self, key, default):
        with self._lock:
            return self._config.get(key, default)


class FramePipeline:
    def __init__(self, output_dir="output", fps=15, interval_frames=2, udp_port=9999):
        self.output_dir = output_dir
        self.watch_dir = os.path.join(output_dir, "watch")
        self.fps = fps
        self.interval_frames = interval_frames
        self.client = replicate.Client(api_token=os.environ.get("REPLICATE_API_TOKEN"))
        self.td = TDController(port=udp_port)

        Path(output_dir).mkdir(exist_ok=True)
        Path(self.watch_dir).mkdir(exist_ok=True)

    def _generate(self, input_path, prompt):
        with open(input_path, "rb") as img_file:
            output = self.client.run(
                "black-forest-labs/flux-dev",
                input={"image": img_file, "prompt": prompt, "strength": 0.8},
            )
        url = output[0] if isinstance(output, list) else output
        response = requests.get(url)
        return Image.open(io.BytesIO(response.content))

    def _save(self, image, generated_count):
        watch_path = os.path.join(self.watch_dir, "current_frame.jpg")
        image.save(watch_path, quality=95)

        history_path = os.path.join(self.output_dir, f"generated_{generated_count:06d}.jpg")
        image.save(history_path, quality=95)

        return watch_path

    def capture_and_process(self, camera_id=0, prompt="", duration_sec=30):
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

                if time.time() - start_time > duration_sec:
                    print(f"Finished after {duration_sec}s")
                    break

                # TDからのパラメーターを反映
                current_prompt = self.td.get('prompt', prompt)
                current_interval = int(self.td.get('interval', self.interval_frames))

                input_path = os.path.join(self.output_dir, f"input_{frame_count:06d}.jpg")
                cv2.imwrite(input_path, frame)

                if frame_count % current_interval == 0:
                    print(f"[frame {frame_count}] prompt='{current_prompt}' interval={current_interval}")
                    try:
                        image = self._generate(input_path, current_prompt)
                        watch_path = self._save(image, generated_count)
                        generated_count += 1
                        print(f"  -> Saved: {watch_path}")
                    except Exception as e:
                        print(f"  Error: {e}")

                cv2.imshow("Webcam Feed", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
        finally:
            cap.release()
            cv2.destroyAllWindows()
            print(f"Captured: {frame_count} frames, Generated: {generated_count} images")

        return generated_count
