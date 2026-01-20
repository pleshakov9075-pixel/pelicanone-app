# Infra runbook

## Запуск

```bash
cd pelicanone-app/infra
docker compose up -d --build
```

## Проверка

```bash
curl -I http://ai.pelicanstudio.ru
curl -I https://ai.pelicanstudio.ru
curl -I https://ai.pelicanstudio.ru/assets/<file>.js
curl https://ai.pelicanstudio.ru/api/v1/health
```

Ожидаемые ответы:

- `http://ai.pelicanstudio.ru` возвращает `301` на `https://`.
- `https://ai.pelicanstudio.ru` возвращает `200`.
- `https://ai.pelicanstudio.ru/assets/<file>.js` возвращает `200`.
- `/api/v1/health` возвращает `ok` (если в backend есть этот endpoint).

## Сертификаты

Контейнер Nginx читает сертификаты с хоста read-only:

```
/etc/letsencrypt/live/ai.pelicanstudio.ru/fullchain.pem
/etc/letsencrypt/live/ai.pelicanstudio.ru/privkey.pem
```

Если сертификаты лежат в другом месте, примонтируйте их в контейнер
или обновите пути в `infra/nginx/nginx.conf`.

## Критерии приёмки

```bash
ss -ltnp | grep -E ':80|:443'
```

```bash
curl -I https://ai.pelicanstudio.ru/
```

```bash
curl -I https://ai.pelicanstudio.ru/.env
curl -I https://ai.pelicanstudio.ru/.env.production
```

```bash
curl -I https://ai.pelicanstudio.ru/api/v1/health
```
