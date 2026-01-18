# PelicanOne 2.0 Monorepo

Единый репозиторий для backend (FastAPI) и frontend (React/Vite) с поддержкой Telegram WebApp, VK Mini Apps и Web.

## Структура

```
backend/   FastAPI + SQLAlchemy async + RQ
frontend/  React + Vite + TS + TanStack Query + shadcn/ui
infra/     docker-compose + nginx
```

## Быстрый старт (dev)

```bash
cp .env.example .env
make up
```

Backend: http://localhost:8000
Frontend: http://localhost:5173
Nginx: http://localhost

## Миграции

```bash
make migrate
```

## Worker

```bash
docker compose -f infra/docker-compose.yml logs -f worker
```

## Настройка Telegram/VK

- Telegram: установите `TELEGRAM_BOT_TOKEN` в `.env`.
- VK: установите `VK_APP_SECRET` в `.env`.

Auth для Web режима отсутствует: авторизация осуществляется через Telegram/VK init data.

## Credits

- 1 кредит = 1 рубль.
- Пополнение: `/api/v1/billing/topup` (мок, `reason=topup_mock`).

## GenAPI

Требуются переменные `GENAPI_BASE_URL` и `GENAPI_API_KEY`.

## Тесты

```bash
cd backend
pytest
```
