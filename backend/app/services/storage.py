from typing import Dict
from app.models.state import TamagotchiState

_STATE: Dict[str, TamagotchiState] = {}

def get_state(user_id: str) -> TamagotchiState | None:
    return _STATE.get(user_id)

def set_state(state: TamagotchiState) -> None:
    _STATE[state.user_id] = state