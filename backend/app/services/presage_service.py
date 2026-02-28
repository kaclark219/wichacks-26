'''
import os
from presage_technologies import Physiology

_physio_client = None

def get_physio_client() -> Physiology:
    """
    Lazily initialize the Presage Physiology client.
    Reads API key from PRESAGE_API_KEY env var.
    """
    global _physio_client
    if _physio_client is None:
        api_key = os.environ.get("PRESAGE_API_KEY")
        if not api_key:
            raise RuntimeError("Missing PRESAGE_API_KEY environment variable")
        _physio_client = Physiology('api_key')
    return _physio_client


def queue_hr_rr_processing(video_path: str, preprocess: bool = False, compress: bool = False) -> str:
    """
    Upload a video and queue HR/RR processing.
    Returns Presage video/job id.
    """
    physio = get_physio_client()
    # The client supports preprocess/compress options per their docs
    return physio.queue_processing_hr_rr(video_path, preprocess=preprocess, compress=compress)


def retrieve_processing_result(job_id: str):
    """
    Poll for results. Returns dict when ready, or falsy/None if not ready yet.
    """
    physio = get_physio_client()
    return physio.retrieve_result(job_id)
'''