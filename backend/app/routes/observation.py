from flask import Blueprint, jsonify, request
from app.services.tamagotchi_service import apply_observation

observation_bp = Blueprint("observation", __name__)

@observation_bp.post("/api/observation")
def observation():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id") or "default"
    status = data.get("status") or "focused"  # "focused" | "idle" | "phone" | "sleep"

    st = apply_observation(user_id=user_id, status=status)

    return jsonify({
        "ok": True,
        "tamagotchi": {
            "focus": round(st.focus, 2),
            "mood": st.mood,
            "last_status": st.last_status,
            "last_ts": st.last_ts,
        }
    })