# GrindOS — запуск и хостинг

Данные пользователя живут в `localStorage` браузера — отдельная БД не нужна. Серверу
нужен только ключ ИИ (`OPENROUTER_API_KEY` или `ANTHROPIC_API_KEY`), и только для
генерации деревьев/тестов/разборов. Без ключа приложение работает на офлайн-черновиках.

> ⚠️ Не коммить реальные ключи. Они только в `.env.local` (он в `.gitignore`).
> Если ключ когда-то попадал в git/публичный репозиторий — перевыпусти его.

---

## 1. Локально (для себя)

```bash
npm install
cp .env.local.example .env.local   # вставь свой ключ
npm run dev                         # http://localhost:3000
```

## 2. Общий доступ в локальной сети (твой комп → телефон/другой ноут)

Собери прод-версию и запусти с привязкой ко всем интерфейсам:

```bash
npm run build
npm run start:lan        # next start -H 0.0.0.0 -p 3000
```

Узнай IP компьютера в сети и открой его с другого устройства (та же Wi‑Fi):

- macOS: `ipconfig getifaddr en0`  → напр. `192.168.1.42`
- открой на телефоне: `http://192.168.1.42:3000`

Если не открывается — проверь файрвол:
- macOS: Системные настройки → Сеть → Файрвол → разрешить входящие для `node`.

## 3. Доступ из интернета без своего сервера (туннель)

Быстро показать наружу (ссылка живёт, пока команда запущена):

```bash
# вариант A — Cloudflare (рекомендую, без аккаунта)
npm run start:lan
npx cloudflared tunnel --url http://localhost:3000

# вариант B — localtunnel
npx localtunnel --port 3000
```

Получишь публичный `https://...` адрес. Ключ ИИ остаётся на твоём компе (на сервере-туннеле
его нет — запрос идёт к твоему процессу).

## 4. Хостинг на сервере (потом)

### Вариант A — Vercel (проще всего для Next.js)
1. Залей репозиторий на GitHub (без `.env.local`).
2. Импортируй проект в Vercel.
3. В Project Settings → Environment Variables добавь `OPENROUTER_API_KEY` (и/или
   `ANTHROPIC_API_KEY`, опц. `OPENROUTER_MODEL`).
4. Deploy. Vercel сам соберёт и поднимет.

### Вариант B — Docker на любом VPS
`next.config.mjs` уже собирает standalone-сервер, есть `Dockerfile`:

```bash
docker build -t grindos .
docker run -d --restart unless-stopped -p 80:3000 \
  -e OPENROUTER_API_KEY=sk-or-... \
  --name grindos grindos
```

### Вариант C — голый Node на VPS
```bash
npm ci && npm run build
OPENROUTER_API_KEY=sk-or-... npm run start:lan
# дальше — за reverse-proxy (nginx/caddy) + HTTPS, процесс под pm2/systemd
```

## Переменные окружения
| Переменная | Назначение |
|---|---|
| `OPENROUTER_API_KEY` | ключ OpenRouter (имеет приоритет, если задан) |
| `ANTHROPIC_API_KEY` | ключ Anthropic (если без OpenRouter) |
| `OPENROUTER_MODEL` | модель OpenRouter (дефолт `google/gemini-flash-1.5`) |
| `ANTHROPIC_MODEL` | модель Anthropic (дефолт `claude-haiku-4-5-20251001`) |
