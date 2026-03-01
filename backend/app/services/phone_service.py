import os
from dataclasses import dataclass
from typing import List, Tuple, Optional

from click import Path
import cv2
import numpy as np

# COCO class id for "cell phone" in the standard 80-class list is 67 (0-indexed)
COCO_CELL_PHONE_ID = 67


@dataclass
class Detection:
    cls_id: int
    conf: float
    box: Tuple[int, int, int, int]  # x, y, w, h


class PhoneDetector:
    """
    YOLO (ONNX) detector using OpenCV DNN.
    Expects a YOLOv8-style ONNX export: output shape (1, 84, N) or similar.
    """
    def __init__(
        self,
        model_path: str,
        conf_thresh: float = 0.35,
        iou_thresh: float = 0.45,
        input_size: int = 640,
    ):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found: {model_path}")

        self.net = cv2.dnn.readNetFromONNX(model_path)
        # CPU inference (safe default)
        self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)

        self.conf_thresh = conf_thresh
        self.iou_thresh = iou_thresh
        self.input_size = input_size

    def _preprocess(self, img_bgr: np.ndarray) -> Tuple[np.ndarray, float, float]:
        h, w = img_bgr.shape[:2]
        size = self.input_size

        # Letterbox resize to square
        scale = min(size / w, size / h)
        new_w, new_h = int(w * scale), int(h * scale)
        resized = cv2.resize(img_bgr, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        canvas = np.full((size, size, 3), 114, dtype=np.uint8)
        pad_x = (size - new_w) // 2
        pad_y = (size - new_h) // 2
        canvas[pad_y:pad_y + new_h, pad_x:pad_x + new_w] = resized

        blob = cv2.dnn.blobFromImage(
            canvas, scalefactor=1 / 255.0, size=(size, size), swapRB=True, crop=False
        )
        return blob, scale, (pad_x, pad_y)

    def _postprocess(
        self,
        outputs: np.ndarray,
        img_shape: Tuple[int, int],
        scale: float,
        pad: Tuple[int, int],
    ) -> List[Detection]:
        """
        Supports YOLOv8 ONNX export output:
        - Often: (1, 84, N) where 84 = 4 box + 80 class scores
        We'll transpose into (N, 84).
        """
        h, w = img_shape
        pad_x, pad_y = pad

        out = outputs
        if isinstance(out, (list, tuple)):
            out = out[0]

        out = np.squeeze(out)

        # Handle common shapes: (84, N) -> transpose to (N, 84)
        if out.ndim == 2 and out.shape[0] < out.shape[1]:
            out = out.T  # (N, 84)

        if out.ndim != 2 or out.shape[1] < 6:
            return []

        boxes = []
        confs = []
        cls_ids = []

        for row in out:
            # row: [cx, cy, bw, bh, class0..class79]
            cx, cy, bw, bh = row[0:4]
            class_scores = row[4:]
            cls_id = int(np.argmax(class_scores))
            cls_conf = float(class_scores[cls_id])

            if cls_conf < self.conf_thresh:
                continue

            # Convert from letterboxed coords back to original image coords
            x = (cx - bw / 2.0)
            y = (cy - bh / 2.0)

            # undo letterbox padding + scaling
            x = (x - pad_x) / scale
            y = (y - pad_y) / scale
            bw = bw / scale
            bh = bh / scale

            x = int(max(0, min(w - 1, x)))
            y = int(max(0, min(h - 1, y)))
            bw = int(max(1, min(w - x, bw)))
            bh = int(max(1, min(h - y, bh)))

            boxes.append([x, y, bw, bh])
            confs.append(cls_conf)
            cls_ids.append(cls_id)

        if not boxes:
            return []

        idxs = cv2.dnn.NMSBoxes(boxes, confs, self.conf_thresh, self.iou_thresh)
        detections: List[Detection] = []
        if len(idxs) > 0:
            for i in idxs.flatten():
                detections.append(Detection(cls_id=cls_ids[i], conf=float(confs[i]), box=tuple(boxes[i])))
        return detections

    def detect(self, img_bgr: np.ndarray) -> List[Detection]:
        blob, scale, pad = self._preprocess(img_bgr)
        self.net.setInput(blob)
        outputs = self.net.forward()
        return self._postprocess(outputs, img_bgr.shape[:2], scale, pad)


# Singleton detector (loaded once)
_detector: Optional[PhoneDetector] = None

def get_phone_detector() -> PhoneDetector:
    global _detector
    if _detector is None:
        BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        DEFAULT_MODEL_PATH = os.path.join(BACKEND_ROOT, "app", "models", "yolov8n.onnx")

        model_path = os.environ.get("PHONE_MODEL_PATH", DEFAULT_MODEL_PATH)
       
        _detector = PhoneDetector(model_path=model_path)
    return _detector


def detect_phone(img_bgr: np.ndarray) -> dict:
    det = get_phone_detector()
    detections = det.detect(img_bgr)

    phone_dets = [d for d in detections if d.cls_id == COCO_CELL_PHONE_ID]
    phone_detected = len(phone_dets) > 0
    best_conf = max((d.conf for d in phone_dets), default=0.0)

    return {
        "phone_detected": phone_detected,
        "confidence": best_conf,
        "boxes": [
            {"x": x, "y": y, "w": w, "h": h, "conf": d.conf}
            for d in phone_dets
            for (x, y, w, h) in [d.box]
        ],
    }