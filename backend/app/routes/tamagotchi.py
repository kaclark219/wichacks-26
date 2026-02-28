from flask import Blueprint, jsonify, request
from app.services.tamagotchi_service import get_or_init, reset

tamagotchi_bp = Blueprint("tamagotchi", __name__)

def _user_id() -> str:
    return request.args.get("user_id") or request.headers.get("X-User-Id") or "default"

@tamagotchi_bp.get("/api/tamagotchi/state")
def state():
    st = get_or_init(_user_id())
    return jsonify({
        "user_id": st.user_id,
        "focus": round(st.focus, 2),
        "mood": st.mood,
        "last_status": st.last_status,
        "last_ts": st.last_ts,
    })

@tamagotchi_bp.post("/api/tamagotchi/reset")
def do_reset():
    st = reset(_user_id())
    return jsonify({
        "user_id": st.user_id,
        "focus": round(st.focus, 2),
        "mood": st.mood,
        "last_status": st.last_status,
        "last_ts": st.last_ts,
    })