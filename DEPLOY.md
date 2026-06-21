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
| `LLM_DAILY_CAP` | макс. число ИИ-вызовов в сутки на инстанс (дефолт 3000) — жёсткий потолок бюджета |

## Безопасность (для публичного запуска / рекламы)

Единственная платная поверхность — ИИ-роуты (`/api/generate-tree`, `/api/generate-quiz`,
`/api/explain-node`). Что уже включено:

- **Rate limit по IP** (`lib/ratelimit.ts`): tree 10 / 5 мин, quiz 15 / 5 мин, explain 20 / 5 мин,
  track 120 / мин. Превышение: tree → бесплатный офлайн-черновик; quiz/explain → 429.
- **Глобальный дневной потолок** ИИ-вызовов `LLM_DAILY_CAP` (по умолчанию 3000): при достижении
  tree → офлайн, quiz/explain → 503. Защита от распределённого флуда (много IP).
- **Лимиты длины ввода**: topic ≤200, plan ≤4000, focus ≤2000 символов — против раздувания токенов.
- **Ключи только на сервере** (`lib/llm.ts` + route handlers); в клиентский бандл не попадают.
- **Заголовки безопасности** (`next.config.mjs`): nosniff, X-Frame-Options, Referrer-Policy,
  Permissions-Policy; `poweredByHeader: false`.
- **Анонимный cookie `gid`** (middleware) — без PII, только для атрибуции стоимости/событий.

Рекомендации перед платным трафиком:
1. **Сменить модель на дешёвую.** Сейчас `OPENROUTER_MODEL=anthropic/claude-sonnet-4.6` —
   дорого (~$0.0035 за «разбор», дерево ещё дороже). Для бесплатного продукта поставь
   `google/gemini-flash-1.5` или `openai/gpt-4o-mini` — дешевле в десятки раз.
2. Выставить лимит трат на стороне OpenRouter (Billing → limits), как страховку.
3. Подобрать `LLM_DAILY_CAP` под свой бюджет: дневной максимум ≈ `LLM_DAILY_CAP × средняя_цена_вызова`.

## Стоимость на пользователя (как считать)

Каждый ИИ-вызов пишет в stdout строку JSON, напр.:
`{"kind":"llm","route":"tree","gid":"<id>","model":"...","promptTokens":..,"completionTokens":..,"costUsd":0.01,"ms":..,"ok":true}`
А события вовлечения: `{"kind":"event","event":"app_open","gid":"<id>"}`.

В Railway → Logs (или `railway logs`) выгружаешь логи и считаешь:
- **Суммарная стоимость** = сумма `costUsd` по строкам `kind:"llm"`.
- **Активные пользователи** = число уникальных `gid` среди `event:"app_open"`.
- **Средняя стоимость на пользователя** = суммарная стоимость / уникальные `gid`.
- Воронка: `app_open` → `tree_generated` → `focus_complete`.

Пример (jq):
`railway logs | grep '"kind":"llm"' | jq -s 'map(.costUsd//0)|add'`  — общая трата;
`railway logs | grep app_open | jq -r .gid | sort -u | wc -l`  — уникальные пользователи.
