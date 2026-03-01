"""
Focus detection API - uses Presage if available, falls back to eye tracking
"""
from flask import Blueprint, jsonify
from app.services.focus_service import get_focus_status, compute_focus_score

focus_bp = Blueprint("focus", __name__)


@focus_bp.get("/api/focus/status")
def focus_status():
    """
    Check which focus detection method is currently active.
    
    Response:
    {
        "presage_available": bool,
        "active_method": "smartspectra" | "eye_tracking",
        "eligible_for_presage_category": bool
    }
    """
    return jsonify(get_focus_status())


@focus_bp.get("/api/focus/current")
def current_focus():
    """
    Get current focus score using best available method.
    Works without image if Presage SmartSpectra is running.
    
    Response:
    {
        "focus_score": 0.0-1.0,
        "method": "smartspectra" | "eye_tracking",
        "details": {...},
        "eligible_for_presage_category": bool
    }
    """
    # Note: For eye tracking fallback, you'd need to pass latest webcam frame
    # For now, this only works fully when Presage is available
    result = compute_focus_score()
    return jsonify(result)
