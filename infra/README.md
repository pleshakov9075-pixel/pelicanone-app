# Infra runbook

## Запуск

```bash
cd /opt/pelicanone-app/infra
docker compose down
docker compose up -d --build
```

## Dev reset

Проект в стадии разработки, поэтому при локальном сбросе окружения используем:

```bash
docker compose down -v
```

## Production: Alembic stamp + manual migration (опционально)

Если в продакшене есть `alembic_version`, которого нет в репозитории, можно:

1. Подготовить “bridge migration” в репозитории (пустая миграция с нужным
   revision id и корректным `down_revision`).
2. На сервере выполнить:

```bash
alembic stamp <known_revision>
alembic upgrade head
```

3. При необходимости выполнить ручные изменения схемы (например, добавить
   отсутствующие поля в `jobs`) и зафиксировать их следующей миграцией.

## ENV

Обязательные переменные:

```
MEDIA_DIR=/app/media
MEDIA_BASE_URL=/media
MEDIA_TTL_SECONDS=86400
MEDIA_CLEANUP_INTERVAL_SECONDS=600
```

## Проверка

```bash
ss -ltnp | grep ':80'
ss -ltnp | grep ':443'
curl -I http://ai.pelicanstudio.ru        # 301 -> https
curl -I https://ai.pelicanstudio.ru       # 200
curl -I https://ai.pelicanstudio.ru/.env  # 404
curl -I https://ai.pelicanstudio.ru/assets/index-*.js | grep -i content-type
curl -I https://ai.pelicanstudio.ru/media/ # 404 (листинг запрещён)
curl -s https://ai.pelicanstudio.ru/api/v1/health
```

Ожидаемые ответы:

- `http://ai.pelicanstudio.ru` возвращает редирект на `https`.
- `https://ai.pelicanstudio.ru` возвращает `200`.
- `https://ai.pelicanstudio.ru/.env` возвращает `404`.
- `https://ai.pelicanstudio.ru/media/` возвращает `404`.

## Frontend build checks

```bash
cd /opt/pelicanone-app/frontend
npm ci
npm run build

cd /opt/pelicanone-app/infra
docker compose build nginx
```

## Smoke-check API jobs

```bash
TOKEN="<jwt>"

curl -X POST https://ai.pelicanstudio.ru/api/v1/jobs \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"text","payload":{"network_id":"gpt-5-2","params":{"prompt":"test"}}}'

curl -H "Authorization: Bearer ${TOKEN}" \
  https://ai.pelicanstudio.ru/api/v1/jobs/<job_id>

curl -H "Authorization: Bearer ${TOKEN}" \
  https://ai.pelicanstudio.ru/api/v1/jobs/<job_id>/result
```

## Критерии приёмки

- `ss -ltnp | grep -E ':80|:443'` — оба порта слушаются.
- Chrome / Telegram WebView грузят JS и CSS без pending / reset.
- Сертификат валиден (Let’s Encrypt).

## Проверка media/cleanup

1. Установить тестовый TTL (например, `MEDIA_TTL_SECONDS=60`).
2. Сгенерировать файл через API.
3. Проверить, что файл доступен по URL из результата:

```bash
curl -I https://ai.pelicanstudio.ru/media/<file_id>.<ext>
```

4. Подождать >60 секунд и убедиться, что файл удалён:

```bash
curl -I https://ai.pelicanstudio.ru/media/<file_id>.<ext> # 404
```

## Пример curl для jobs

```bash
TOKEN="<jwt>"
curl -X POST https://ai.pelicanstudio.ru/api/v1/jobs \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"image","payload":{"network_id":"<network_id>","params":{"prompt":"test"}}}'

curl -H "Authorization: Bearer ${TOKEN}" https://ai.pelicanstudio.ru/api/v1/jobs?mine=true
```

## TLS (проверка)

1. Убедиться, что на хосте есть сертификаты в `/etc/letsencrypt/live/ai.pelicanstudio.ru`.
2. Перезапустить стек:

```bash
docker compose up -d --build
```
