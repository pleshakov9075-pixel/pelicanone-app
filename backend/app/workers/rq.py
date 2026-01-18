from redis import Redis
from rq import Queue

from app.core.settings import get_settings

settings = get_settings()


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url)


def get_queue() -> Queue:
    return Queue("pelicanone", connection=get_redis())
