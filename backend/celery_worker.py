from celery import Celery
from celery.schedules import crontab

celery_app = Celery(
    "election_system",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0"
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
)

celery_app.autodiscover_tasks(['tasks'])

celery_app.conf.beat_schedule = {
    'update-election-statuses-every-minute': {
        'task': 'tasks.elections.update_all_election_statuses',
        'schedule': crontab(minute='*'),
    },
}