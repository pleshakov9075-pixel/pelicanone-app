# Infra runbook

## Запуск

```bash
cd /opt/pelicanone-app/infra
docker compose down
docker compose up -d --build
```

## Проверка

```bash
ss -ltnp | grep ':80'
ss -ltnp | grep ':443'
curl -I http://ai.pelicanstudio.ru
curl -I https://ai.pelicanstudio.ru
curl -I https://ai.pelicanstudio.ru/.env
```

Ожидаемые ответы:

- `http://ai.pelicanstudio.ru` возвращает редирект на `https`.
- `https://ai.pelicanstudio.ru` возвращает `200`.
- `https://ai.pelicanstudio.ru/.env` возвращает `404`.

## TLS (проверка)

1. Убедиться, что на хосте есть сертификаты в `/etc/letsencrypt/live/ai.pelicanstudio.ru`.
2. Перезапустить стек:

```bash
docker compose up -d --build
```
