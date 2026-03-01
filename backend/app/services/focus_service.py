from typing import Dict, Any
from app.services.presage_realtime import get_presage_service
from app.services.eye_service import get_eye_detector
from app.services.phone_service import detect_phone

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
    
    # OpenCV fallback: phone detection + eye detection
    phone = detect_phone(img_bgr)
    detector = get_eye_detector()
    eye = detector.analyze(img_bgr)

    phone_detected = bool(phone["phone_detected"])
    eyes_closed = bool(eye["eyes_closed"])

    # Determine focus score based on status priority: phone > sleep > focused
    if phone_detected:
        focus = 0.0
        status = "phone"
    elif eyes_closed:
        focus = 0.1
        status = "sleep"
    elif eye["face_present"]:
        ear = eye.get("ear", 0.3)
        focus = min(1.0, ear / 0.3) if ear else 0.5
        status = "focused"
    else:
        focus = 0.0
        status = "unknown"

    return {
        "focus_score": float(focus),
        "method": "fallback",
        "status": status,
        "details": {
            "face_detected": eye["face_present"],
            "eyes_closed": eyes_closed,
            "phone_detected": phone_detected,
            "reason": "Using OpenCV fallback due to presage unavailable"
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
