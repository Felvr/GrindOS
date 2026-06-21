# GrindOS — план бэкенда (на будущее)

Сейчас приложение полностью клиентское: все данные в `localStorage` (см. `lib/store.ts`).
Авторизация, синхронизация телефон↔ПК и еженедельные лиги требуют сервера с БД.
Этот документ — план, как их добавить. В коде уже есть **заглушки** роутов
(`app/api/auth/*`, `app/api/state`, `app/api/league`), которые пока отвечают `501`.

## Стек (выбран)
- **Railway Postgres** (плагин в проекте Railway → даёт `DATABASE_URL`).
- **Своя авторизация:** логин + пароль, `bcrypt` для хэша, **JWT в httpOnly cookie**.
- ORM: **Prisma** (или `pg` напрямую — на выбор; Prisma удобнее).
- Зависимости пока НЕ установлены (добавим при реализации): `prisma`, `@prisma/client`, `bcryptjs`, `jsonwebtoken`.

## Переменные окружения (добавить в Railway → Variables)
| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | строка подключения Postgres (даёт плагин Railway) |
| `JWT_SECRET` | секрет для подписи сессионных JWT |

## Схема БД
```sql
-- пользователи
users (
  id          uuid primary key default gen_random_uuid(),
  username    text unique not null,
  pass_hash   text not null,          -- bcrypt
  created_at  timestamptz default now()
)

-- всё состояние клиента одним JSON-блобом (index + grinds + profile)
user_state (
  user_id     uuid primary key references users(id) on delete cascade,
  blob        jsonb not null,         -- то, что сейчас лежит в localStorage
  weekly_xp   integer not null default 0,   -- денормализация для лиг
  week_start  date,                   -- понедельник текущей недели (UTC)
  league_tier integer not null default 0,
  updated_at  timestamptz default now()
)
```
(Лиги можно держать прямо в `user_state`: `weekly_xp` + `league_tier` + `week_start`.
Группа лиги — детерминированно по `league_tier` + бакету, либо отдельная таблица
`league_groups` при росте аудитории.)

## Роуты (заменить заглушки)
- `POST /api/auth/register` — создать `users` (bcrypt), выдать JWT-cookie.
- `POST /api/auth/login` — проверить пароль, выдать JWT-cookie.
- `POST /api/auth/logout` — очистить cookie.
- `GET  /api/auth/me` — по cookie вернуть `{ id, username }` или 401.
- `GET  /api/state` — вернуть `blob` пользователя.
- `PUT  /api/state` — upsert `blob`; пересчитать `weekly_xp` (сумма XP по таймстемпам
  за текущую неделю: `runLog.gain` гриндов + `profile.xpLog`).
- `GET  /api/league` — standings группы; при смене недели — settle (топ‑3 вверх,
  нижние‑3 вниз), сброс `weekly_xp`.

## Интеграция с фронтом (минимальные правки)
- `lib/store.ts` — после локального сохранения дебаунсом слать `PUT /api/state`,
  если пользователь залогинен; на логине — `GET /api/state` и адаптировать
  локальные данные (если на сервере пусто — залить локальные).
- Добавить `lib/auth.tsx` (контекст) + окно входа/регистрации (UI).
- Страница `/league` потребляет `GET /api/league`.

## Деплой
1. Railway → проект → **New → Database → PostgreSQL** (появится `DATABASE_URL`).
2. Variables: добавить `JWT_SECRET`.
3. Prisma: `npx prisma migrate deploy` в build/release-команде.
