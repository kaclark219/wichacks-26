import redis
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class PresageRealtimeService:
    _instance = None
    
    def __init__(self):
        self.redis_client = None
        self.latest_metrics = None
        self._connect()
    
    def _connect(self):
        try:
            self.redis_client = redis.Redis(
                host='localhost',
                port=6379,
                socket_connect_timeout=1,
                decode_responses=True
            )
            self.redis_client.ping()
            logger.info("Connected to Redis for Presage metrics")
        except Exception as e:
            self.redis_client = None
            logger.debug(f"Could not connect to Redis: {e}")
    
    def is_available(self) -> bool:
        if not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except:
            return False
    
    def get_latest_metrics(self) -> Optional[Dict[str, Any]]:
        if not self.is_available():
            return None
        
        try:
            result = self.redis_client.xread(
                {'presage:metrics': '0'},
                count=1,
                block=100
            )
            
            if result:
                _, messages = result[0]
                if messages:
                    _, data = messages[-1]
                    message = data.get('message', '')
                    if message:
                        parsed = json.loads(message)
                        metrics = parsed.get('metrics', {})
                        return {
                            'pulse_value': metrics.get('pulse', 0),
                            'pulse_confidence': metrics.get('pulse_confidence', 0),
                            'breathing_rate': metrics.get('breathing', 0)
                        }
        except Exception as e:
            logger.debug(f"Error reading metrics: {e}")
        
        return None


def get_presage_service() -> PresageRealtimeService:
    if PresageRealtimeService._instance is None:
        PresageRealtimeService._instance = PresageRealtimeService()
    return PresageRealtimeService._instance
