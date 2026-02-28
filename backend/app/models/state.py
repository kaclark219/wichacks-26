from dataclasses import dataclass
from typing import Literal

Mood = Literal["happy", "content", "worried", "upset"]

@dataclass
class TamagotchiState:
    user_id: str
    focus: float = 40.0          # start at 40%
    mood: Mood = "worried"       # based on focus
    last_ts: float = 0.0         # unix seconds
    last_status: Literal["focused", "phone"] = "focused"