import pytest

from app.api.v1.deps import get_rq_queue
from app.auth.tokens import create_access_token
from app.core.repositories.credits import CreditRepository
from app.core.repositories.users import UserRepository


class DummyQueue:
    def __init__(self):
        self.enqueued = []

    def enqueue(self, func, *args, **kwargs):
        self.enqueued.append((func, args, kwargs))


@pytest.mark.asyncio
async def test_create_job(client, db_session):
    user_repo = UserRepository(db_session)
    user = await user_repo.get_or_create("web", "user-1")
    credit_repo = CreditRepository(db_session)
    await credit_repo.create_tx(user.id, delta=100, reason="topup_mock")
    await db_session.commit()

    token = create_access_token({"user_id": str(user.id), "platform": "web"})
    queue = DummyQueue()

    def override_queue():
        return queue

    client.app.dependency_overrides[get_rq_queue] = override_queue

    response = await client.post(
        "/api/v1/jobs",
        headers={"Authorization": f"Bearer {token}"},
        json={"type": "image", "payload": {"network_id": "test", "params": {"a": 1}}},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "queued"
    assert queue.enqueued

    client.app.dependency_overrides.pop(get_rq_queue, None)
