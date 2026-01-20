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
curl -I http://ai.pelicanstudio.ru        # 301 -> https
curl -I https://ai.pelicanstudio.ru       # 200
curl -I https://ai.pelicanstudio.ru/.env  # 404
```

Ожидаемые ответы:

- `http://ai.pelicanstudio.ru` возвращает редирект на `https`.
- `https://ai.pelicanstudio.ru` возвращает `200`.
- `https://ai.pelicanstudio.ru/.env` возвращает `404`.

## Критерии приёмки

- `ss -ltnp | grep -E ':80|:443'` — оба порта слушаются.
- Chrome / Telegram WebView грузят JS и CSS без pending / reset.
- Сертификат валиден (Let’s Encrypt).

## TLS (проверка)

1. Убедиться, что на хосте есть сертификаты в `/etc/letsencrypt/live/ai.pelicanstudio.ru`.
2. Перезапустить стек:

```bash
docker compose up -d --build
```
