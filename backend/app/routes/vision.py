import time
from flask import Blueprint, jsonify, request

from app.utils.image_io import decode_image_bytes_to_bgr, BadImageError
from app.services.phone_service import detect_phone
from app.services.eye_service import get_eye_detector
from app.services.tamagotchi_service import apply_observation

vision_bp = Blueprint("vision", __name__)

@vision_bp.post("/api/analyze_frame")
def analyze_frame():
    if "frame" not in request.files:
        return jsonify({"error": "Missing file field 'frame'"}), 400

    file = request.files["frame"]
    image_bytes = file.read()

    try:
        img_bgr = decode_image_bytes_to_bgr(image_bytes)
    except BadImageError as e:
        return jsonify({"error": str(e)}), 400

    user_id = request.args.get("user_id") or request.headers.get("X-User-Id") or "default"

    phone = detect_phone(img_bgr)
    eye = get_eye_detector().analyze(img_bgr)

    phone_detected = bool(phone["phone_detected"])
    eyes_closed = bool(eye["eyes_closed"])

    # Status priority: phone > sleep > focused
    if phone_detected:
        status = "phone"
    elif eyes_closed:
        status = "sleep"
    else:
        status = "focused"

    st = apply_observation(user_id=user_id, status=status)

    return jsonify(
        {
            "phone_detected": phone_detected,
            "phone_confidence": phone["confidence"],
            "phone_boxes": phone["boxes"],
            "face_present": eye["face_present"],
            "eyes_closed": eyes_closed,
            "ear": eye["ear"],
            "timestamp": int(time.time()),
            "tamagotchi": {
                "focus": round(st.focus, 2),
                "mood": st.mood,
                "last_status": st.last_status,
                "last_ts": st.last_ts,
            },
        }
    )