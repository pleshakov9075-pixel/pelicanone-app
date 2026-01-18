up:
	docker compose -f infra/docker-compose.yml up -d --build

down:
	docker compose -f infra/docker-compose.yml down

logs:
	docker compose -f infra/docker-compose.yml logs -f

migrate:
	docker compose -f infra/docker-compose.yml exec backend alembic upgrade head

fmt:
	cd backend && python -m black app tests

lint:
	cd backend && python -m ruff check app tests
