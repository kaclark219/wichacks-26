'''

import os
import time
import tempfile
from flask import Blueprint, jsonify, request

from app.services.presage_service import queue_hr_rr_processing, retrieve_processing_result

presage_bp = Blueprint("presage", __name__)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi"}

# in-memory job store (optional metadata)
# You can delete this later when you move to Redis/SQLite.
JOB_META = {}  # job_id -> {"created_at": int, "filename": str}

def _ext_ok(filename: str) -> bool:
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTENSIONS


@presage_bp.post("/api/presage/clip")
def upload_clip():
    """
    Expects multipart/form-data with key 'clip' containing a video file (mp4/mov/avi).
    Returns a Presage job_id immediately.
    """
    if "clip" not in request.files:
        return jsonify({"error": "Missing file field 'clip'"}), 400

    f = request.files["clip"]
    if not f.filename:
        return jsonify({"error": "Empty filename"}), 400

    if not _ext_ok(f.filename):
        return jsonify({"error": f"Unsupported file type. Use: {sorted(ALLOWED_EXTENSIONS)}"}), 400

    # Save to a temp file because Presage client wants a file path
    suffix = os.path.splitext(f.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        f.save(tmp_path)

    try:
        # preprocess/compress can reduce transfer time; flip on if you want
        job_id = queue_hr_rr_processing(tmp_path, preprocess=False, compress=False)
    finally:
        # Remove the temp file regardless
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    JOB_META[job_id] = {"created_at": int(time.time()), "filename": f.filename}
    return jsonify({"job_id": job_id})


@presage_bp.get("/api/presage/result/<job_id>")
def get_result(job_id: str):
    """
    Poll for Presage results.
    Returns {status: "pending"} until data is ready.
    """
    try:
        data = retrieve_processing_result(job_id)
    except Exception as e:
        # keep error message simple for hackathon; log e if you want
        return jsonify({"status": "error", "error": str(e)}), 500

    if not data:
        return jsonify({"status": "pending", "job_id": job_id})

    return jsonify({"status": "ready", "job_id": job_id, "data": data})
'''