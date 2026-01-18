import logging
from redis import Redis
from rq import Queue, Worker

from app.core.settings import get_settings

logging.basicConfig(level=logging.INFO)

settings = get_settings()


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url)


def get_queue() -> Queue:
    return Queue("pelicanone", connection=get_redis())


def main() -> None:
    conn = get_redis()
    queue = Queue("pelicanone", connection=conn)
    worker = Worker([queue], connection=conn)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()

