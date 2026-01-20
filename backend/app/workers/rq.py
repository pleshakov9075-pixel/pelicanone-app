import datetime as dt
import logging
from redis import Redis
from rq import Queue, Worker

from app.core.settings import get_settings
from app.workers.tasks import cleanup_job_files

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url)


def get_queue() -> Queue:
    return Queue("pelicanone", connection=get_redis())


def _schedule_cleanup(queue: Queue, conn: Redis) -> None:
    try:
        from rq_scheduler import Scheduler
    except Exception as exc:
        logger.exception("cleanup scheduler disabled", exc_info=exc)
        return

    scheduler = Scheduler(queue=queue, connection=conn)
    interval_seconds = settings.files_cleanup_interval_seconds
    if interval_seconds <= 0:
        logger.info("cleanup scheduler disabled: interval=%s", interval_seconds)
        return

    job_id = "cleanup_files"
    try:
        existing_job = scheduler.get_job(job_id)
    except AttributeError:
        existing_job = next((job for job in scheduler.get_jobs() if job.id == job_id), None)

    if existing_job is not None:
        return

    scheduler.schedule(
        scheduled_time=dt.datetime.utcnow() + dt.timedelta(seconds=interval_seconds),
        func=cleanup_job_files,
        interval=interval_seconds,
        repeat=None,
        id=job_id,
        result_ttl=0,
    )


def main() -> None:
    conn = get_redis()
    queue = Queue("pelicanone", connection=conn)
    try:
        _schedule_cleanup(queue, conn)
    except Exception as exc:
        logger.exception("cleanup scheduler disabled", exc_info=exc)
    worker = Worker([queue], connection=conn)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
