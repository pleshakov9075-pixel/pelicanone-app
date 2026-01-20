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

### Docker Compose миграции

```bash
docker compose -f infra/docker-compose.yml up -d db redis
docker compose -f infra/docker-compose.yml run --rm migrations
docker compose -f infra/docker-compose.yml up -d --build
```

## Worker

```bash
docker compose -f infra/docker-compose.yml logs -f worker
```

## Настройка Telegram/VK

- Telegram: установите `TELEGRAM_BOT_TOKEN` в `.env`.
- VK: установите `VK_APP_SECRET` в `.env`.

Auth для Web режима отсутствует: авторизация осуществляется через Telegram/VK init data.

### Авторизация Telegram WebApp

- Во всех защищённых API запросах используется заголовок `X-Telegram-InitData` (значение `window.Telegram.WebApp.initData`). 
- Если заголовок отсутствует, backend вернёт `401 telegram_initdata_missing`.
- Если initData невалиден, backend вернёт `401 telegram_initdata_invalid`.

#### DEV bypass (только для разработки)

Включите, чтобы отлаживать API в обычном браузере без Telegram:

```
DEV_AUTH_BYPASS=true
DEV_USER_PLATFORM_USER_ID=dev
DEV_USER_ID=
```

> ⚠️ Используйте только в dev окружении.

Для фронтенда можно включить `VITE_DEV_AUTH_BYPASS=true`, чтобы UI не блокировал отправку запросов без initData.

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
