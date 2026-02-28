import time
from flask import Blueprint, jsonify, request

from app.utils.image_io import decode_image_bytes_to_bgr, BadImageError
from app.services.phone_service import detect_phone
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

    phone = detect_phone(img_bgr)

    user_id = request.args.get("user_id") or request.headers.get("X-User-Id") or "default"
    st = apply_observation(user_id=user_id, phone_detected=phone["phone_detected"])

    return jsonify({
        "phone_detected": phone["phone_detected"],
        "phone_confidence": phone["confidence"],
        "phone_boxes": phone["boxes"],
        "timestamp": int(time.time()),
        "tamagotchi": {
            "focus": round(st.focus, 2),
            "mood": st.mood,
            "last_status": st.last_status,
            "last_ts": st.last_ts,
        }
    })