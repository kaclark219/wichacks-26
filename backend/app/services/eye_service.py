import os
import math
from typing import Optional

import cv2
import mediapipe as mp

# Indices commonly used for EAR with Face Mesh style landmarks.
# FaceLandmarker outputs the same face mesh landmark topology (478 landmarks). :contentReference[oaicite:3]{index=3}
LEFT_EYE = {"p1": 33, "p4": 133, "p2": 159, "p6": 145, "p3": 158, "p5": 144}
RIGHT_EYE = {"p1": 362, "p4": 263, "p2": 386, "p6": 374, "p3": 385, "p5": 380}


def _dist(a, b) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _ear(pts, idxs) -> float:
    # EAR = (||p2-p6|| + ||p3-p5||) / (2*||p1-p4||)
    p1 = pts[idxs["p1"]]
    p4 = pts[idxs["p4"]]
    p2 = pts[idxs["p2"]]
    p6 = pts[idxs["p6"]]
    p3 = pts[idxs["p3"]]
    p5 = pts[idxs["p5"]]
    denom = 2.0 * _dist(p1, p4)
    if denom <= 1e-6:
        return 1.0
    return (_dist(p2, p6) + _dist(p3, p5)) / denom


class EyeClosureDetector:
    """
    Eye closure detector using MediaPipe Tasks FaceLandmarker + EAR.
    """
    def __init__(self, ear_threshold: float = 0.18, model_path: Optional[str] = None):
        self.ear_threshold = ear_threshold

        model_path = model_path or os.environ.get("FACE_LANDMARKER_MODEL", "models/face_landmarker.task")

        if not os.path.exists(model_path):
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            import urllib.request
            url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
            urllib.request.urlretrieve(url, model_path)

        BaseOptions = mp.tasks.BaseOptions
        FaceLandmarker = mp.tasks.vision.FaceLandmarker
        FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
        RunningMode = mp.tasks.vision.RunningMode

        # IMAGE mode is simplest (synchronous per frame). :contentReference[oaicite:4]{index=4}
        options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path),
            running_mode=RunningMode.IMAGE,
            num_faces=1,
        )
        self.landmarker = FaceLandmarker.create_from_options(options)

    def analyze(self, img_bgr):
        h, w = img_bgr.shape[:2]
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        result = self.landmarker.detect(mp_image)

        # result.face_landmarks is a list (one per detected face)
        if not result.face_landmarks:
            return {"face_present": False, "eyes_closed": False, "ear": None}

        landmarks = result.face_landmarks[0]  # list of NormalizedLandmark
        # Convert normalized -> pixel coords
        pts = [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]

        left_ear = _ear(pts, LEFT_EYE)
        right_ear = _ear(pts, RIGHT_EYE)
        ear = (left_ear + right_ear) / 2.0

        eyes_closed = ear < self.ear_threshold
        return {"face_present": True, "eyes_closed": bool(eyes_closed), "ear": float(ear)}


_detector: Optional[EyeClosureDetector] = None


def get_eye_detector() -> EyeClosureDetector:
    global _detector
    if _detector is None:
        _detector = EyeClosureDetector(ear_threshold=0.18)
    return _detector