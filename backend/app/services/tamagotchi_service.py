import time
from app.models.state import TamagotchiState
from app.services.storage import get_state, set_state

FOCUS_START = 40.0

TICK_SECONDS = 10.0

# +1% per 5 minutes => +1% per 300s => per 10s tick:
FOCUS_GAIN_PER_TICK = 1.0 * (TICK_SECONDS / 300.0)      # 0.033333...

# -5% per 60s => per 10s tick:
FOCUS_LOSS_PER_TICK = 5.0 * (TICK_SECONDS / 60.0)       # 0.833333...


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


def _mood_from_focus(focus: float) -> str:
    if focus >= 70:
        return "happy"
    if focus >= 50:
        return "content"
    if focus >= 30:
        return "worried"
    return "upset"


def _ensure_state(user_id: str, now_ts: float) -> TamagotchiState:
    st = get_state(user_id)
    if st is None:
        st = TamagotchiState(
            user_id=user_id,
            focus=FOCUS_START,
            mood=_mood_from_focus(FOCUS_START),
            last_ts=now_ts,
            last_status="focused",
        )
        set_state(st)
    return st


def apply_observation(user_id: str, phone_detected: bool, now_ts: float | None = None) -> TamagotchiState:
    """
    Update focus in discrete 10-second ticks.

    - We apply N whole ticks since last update, based on the *previous* status.
    - Then we set last_status based on current phone_detected for the next interval.
    """
    now = float(now_ts if now_ts is not None else time.time())
    st = _ensure_state(user_id, now)

    dt_sec = max(0.0, now - float(st.last_ts))
    ticks = int(dt_sec // TICK_SECONDS)  # whole 10s intervals only

    if ticks > 0:
        if st.last_status == "phone":
            st.focus -= FOCUS_LOSS_PER_TICK * ticks
        else:
            st.focus += FOCUS_GAIN_PER_TICK * ticks

        st.focus = _clamp(st.focus)
        st.mood = _mood_from_focus(st.focus)

        # Advance last_ts by whole ticks so leftover seconds carry over
        st.last_ts = float(st.last_ts) + ticks * TICK_SECONDS
    else:
        # no tick passed; mood/focus unchanged
        st.mood = _mood_from_focus(st.focus)

    # Record current status for next time window
    st.last_status = "phone" if phone_detected else "focused"

    set_state(st)
    return st


def get_or_init(user_id: str) -> TamagotchiState:
    now = time.time()
    return _ensure_state(user_id, now)


def reset(user_id: str) -> TamagotchiState:
    st = TamagotchiState(
        user_id=user_id,
        focus=FOCUS_START,
        mood=_mood_from_focus(FOCUS_START),
        last_ts=time.time(),
        last_status="focused",
    )
    set_state(st)
    return st