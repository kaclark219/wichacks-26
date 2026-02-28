import numpy as np
import cv2


class BadImageError(ValueError):
    pass


def decode_image_bytes_to_bgr(image_bytes: bytes):
    """
    Convert raw image bytes (jpg/png) into an OpenCV BGR image (numpy array).
    Raises BadImageError if decoding fails.
    """
    if not image_bytes:
        raise BadImageError("Empty image bytes")

    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)  # BGR
    if img is None:
        raise BadImageError("Could not decode image bytes")
    return img