import datetime as dt
import logging
from redis import Redis
from rq import Queue, Worker
from rq.registry import ScheduledJobRegistry

from app.core.settings import get_settings
from app.workers.tasks import cleanup_media

logging.basicConfig(level=logging.INFO)

settings = get_settings()


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url)


def get_queue() -> Queue:
    return Queue("pelicanone", connection=get_redis())


def main() -> None:
    conn = get_redis()
    queue = Queue("pelicanone", connection=conn)
    _schedule_cleanup(queue, conn)
    worker = Worker([queue], connection=conn)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()


def _schedule_cleanup(queue: Queue, conn: Redis) -> None:
    registry = ScheduledJobRegistry(queue.name, connection=conn)
    if "cleanup_media" in registry.get_job_ids():
        return
    queue.enqueue_in(
        dt.timedelta(seconds=settings.media_cleanup_interval_seconds),
        cleanup_media,
        job_id="cleanup_media",
        result_ttl=0,
    )
