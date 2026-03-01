from dataclasses import dataclass
from typing import Literal

Mood = Literal["happy", "content", "worried", "upset"]
Status = Literal["focused", "phone", "sleep"]

@dataclass
class TamagotchiState:
    user_id: str
    focus: float = 40.0
    mood: Mood = "worried"
    last_ts: float = 0.0
    last_status: Status = "focused"