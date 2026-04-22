import cv2
import os


class WebcamCapture:
    def __init__(self, camera_id=0, fps=30):
        self.cap = cv2.VideoCapture(camera_id)
        self.fps = fps
        self.frame_count = 0

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
        return cv2.waitKey(1) != ord('q')

    def release(self):
        self.cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    capture = WebcamCapture(fps=15)
    try:
        while True:
            frame = capture.capture_frame()
            if frame is None:
                break
            capture.save_frame(frame)
            if not capture.display_frame(frame):
                break
    finally:
        capture.release()
