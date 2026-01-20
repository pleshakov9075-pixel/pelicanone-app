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
curl -I http://ai.pelicanstudio.ru
curl -I http://ai.pelicanstudio.ru/.env
```

Ожидаемые ответы:

- `http://ai.pelicanstudio.ru` возвращает `200`.
- `http://ai.pelicanstudio.ru/.env` возвращает `404`.

## TLS (следующий шаг)

1. Установить certbot на хосте и выпустить сертификат для `ai.pelicanstudio.ru`.
2. После появления `/etc/letsencrypt/live/ai.pelicanstudio.ru`:
   - добавить `443:443` в `ports` сервиса nginx;
   - примонтировать `/etc/letsencrypt:/etc/letsencrypt:ro`;
   - расширить `infra/nginx/nginx.conf` сервером `443 ssl http2`;
   - настроить редирект с `80` на `443`.

Команды будут такими:

```
docker compose up -d --build
```
