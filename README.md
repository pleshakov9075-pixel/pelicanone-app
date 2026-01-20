# PelicanOne 2.0 Monorepo

Единый репозиторий для backend (FastAPI) и frontend (React/Vite) с поддержкой Telegram WebApp.

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

## Настройка Telegram

- Установите `TELEGRAM_BOT_TOKEN` в `.env`.

Auth для Web режима отсутствует: авторизация осуществляется только через Telegram init data.

### Авторизация Telegram WebApp

- Во всех защищённых API запросах используется заголовок `X-Telegram-Init-Data` (значение `window.Telegram.WebApp.initData`).
- Если заголовок отсутствует, backend вернёт `401 Telegram initData is required. Open the app inside Telegram.`.
- Если initData невалиден или просрочен, backend вернёт `401 Invalid Telegram initData signature.`.

## Credits

- 1 кредит = 1 рубль.
- Пополнение: `/api/v1/billing/topup` (мок, `reason=topup_mock`).

### Пополнение через CLI (админ)

```bash
docker compose -f infra/docker-compose.yml exec backend \
  python -m app.cli.credits topup --telegram-id 123456 --amount 300 --reason "manual topup"
```

Если задано `ADMIN_TG_IDS=123,456`, то добавьте `--admin-id` из списка.

### Проверка баланса

- Через MiniApp (раздел «Баланс»).
- Через API в окружении Telegram:

```bash
curl -H "X-Telegram-Init-Data: <initData>" http://localhost/api/v1/credits/balance
```

## GenAPI

Требуются переменные `GENAPI_BASE_URL` и `GENAPI_API_KEY`.

## Тесты

```bash
cd backend
pytest
```
