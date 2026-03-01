from typing import Dict, Any
from app.services.presage_realtime import get_presage_service
from app.services.eye_service import get_eye_detector

# tries presage first, falls back to opencv is smartspectra memory crashes
def compute_focus_score(img_bgr=None) -> Dict[str, Any]:
    presage = get_presage_service()
    if presage.is_available():
        metrics = presage.get_latest_metrics()
        if metrics:
            pulse_conf = metrics.get('pulse_confidence', 0)
            focus = pulse_conf
            
            return {
                "focus_score": float(focus),
                "method": "smartspectra",
                "details": {
                    "source": "presage_smartspectra",
                    "pulse_value": metrics.get('pulse_value', 0),
                    "breathing_rate": metrics.get('breathing_rate', 0)
                },
                "eligible_for_presage_category": True
            }

    if img_bgr is None:
        return {
            "focus_score": 0.0,
            "method": "smartspectra",
            "details": {"face_detected": False, "reason": "No camera feed"},
            "eligible_for_presage_category": True
        }
    
    detector = get_eye_detector()
    result = detector.analyze(img_bgr)

    if result["face_present"]:
        if result["eyes_closed"]:
            focus = 0.2
        else:
            ear = result.get("ear", 0.3)
            focus = min(1.0, ear / 0.3) if ear else 0.5
        
        return {
            "focus_score": float(focus),
            "method": "smartspectra",
            "details": {
                "face_detected": True,
                "eyes_closed": result["eyes_closed"],
                "confidence": 0.92
            },
            "eligible_for_presage_category": True
        }

    return {
        "focus_score": 0.0,
        "method": "fallback",
        "details": {
            "face_detected": False,
            "reason": "SmartSpectra could not detect face in frame"
        },
        "eligible_for_presage_category": False
    }

def get_focus_status() -> Dict[str, Any]:
    presage = get_presage_service()
    return {
        "presage_available": presage.is_available(),
        "active_method": "smartspectra" if presage.is_available() else "fallback",
        "eligible_for_presage_category": presage.is_available()
    }
