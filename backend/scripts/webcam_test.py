import time
import json
import cv2
import requests

API_BASE = "http://127.0.0.1:5050"
USER_ID = "test-user"
SEND_EVERY_SEC = 1.0   # how often to POST frames
JPEG_QUALITY = 75      # smaller -> faster

def main():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Could not open webcam. Try a different index (1/2) or grant camera permissions.")

    last_send = 0.0
    last_result = None
    fps_last = time.time()
    fps_count = 0
    fps = 0.0

    print("Press 'q' to quit.")

    while True:
        ok, frame = cap.read()
        if not ok:
            print("Failed to read frame.")
            break

        now = time.time()

        # FPS counter (local capture FPS)
        fps_count += 1
        if now - fps_last >= 1.0:
            fps = fps_count / (now - fps_last)
            fps_last = now
            fps_count = 0

        # Send a frame every SEND_EVERY_SEC
        if now - last_send >= SEND_EVERY_SEC:
            last_send = now
            try:
                # Encode to jpg for upload
                encode_ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
                if not encode_ok:
                    raise RuntimeError("cv2.imencode failed")

                files = {"frame": ("frame.jpg", buf.tobytes(), "image/jpeg")}
                r = requests.post(
                    f"{API_BASE}/api/analyze_frame",
                    params={"user_id": USER_ID},
                    files=files,
                    timeout=3,
                )
                r.raise_for_status()
                last_result = r.json()

            except Exception as e:
                last_result = {"error": str(e)}

        # Overlay results
        y = 30
        dy = 28

        def put(line):
            nonlocal y
            cv2.putText(frame, line, (12, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (98, 240, 100), 2, cv2.LINE_AA)
            y += dy

        put(f"Capture FPS: {fps:.1f}")
        put(f"POST interval: {SEND_EVERY_SEC:.1f}s")

        if last_result is None:
            put("Waiting for first response...")
        elif "error" in last_result:
            put(f"ERROR: {last_result['error']}")
        else:
            phone = bool(last_result.get("phone_detected", False))
            conf = float(last_result.get("phone_confidence", 0.0))
            emo = str(last_result.get("emotion", "neutral"))

            tama = last_result.get("tamagotchi", {})
            focus = tama.get("focus", None)
            mood = tama.get("mood", None)
            last_status = tama.get("last_status", None)

            put(f"emotion: {emo}")
            put(f"phone_detected: {phone} (conf {conf:.2f})")
            if focus is not None and mood is not None:
                put(f"FOCUS: {focus:.2f}%   mood: {mood}   last_status: {last_status}")
            else:
                put("No tamagotchi data in response (check /api/analyze_frame response).")

        cv2.imshow("Focus Test", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
