# Smart Credit Dashboard

Прототип кредитного конвейера для малого бизнеса. Предприниматель подаёт заявку и отвечает на запросы, сотрудник банка проверяет сведения и принимает решение. Scoring Service рассчитывает объяснимый результат, API хранит состояние заявки и историю действий.

В репозитории есть две версии запуска: production Compose для самостоятельной проверки и локальный режим разработки. Источники ЕГРЮЛ, ФНС, БКИ и банковского оборота представлены синтетическими данными; реальные внешние интеграции не подключены. Scoring детерминированный, внешние ML/LLM-модели не используются.

## Требования

- Docker Desktop с включённым Linux engine.
- Node.js 24.x и pnpm 11.25.0 для локальной разработки.
- Python 3.12 и `uv` 0.12.21 нужны для локального запуска scoring; в Docker они устанавливаются внутри образа.
- Для публикации Compose в интернете задайте собственные пароли и домен. Не используйте значения по умолчанию из примеров.

Версии JavaScript зависимостей закреплены в `pnpm-lock.yaml`, Python зависимостей scoring в `apps/scoring/uv.lock`, документации в `docs/prod/site/package-lock.json`. Образы сервисов и их версии указаны в `infra/prod/docker-compose.yml`.

## Запуск всего решения в Docker

Из корня репозитория скопируйте шаблон окружения:

```bash
cp infra/prod/.env.example infra/prod/.env
```

В PowerShell:

```powershell
Copy-Item infra/prod/.env.example infra/prod/.env
```

Перед публикацией замените `POSTGRES_PASSWORD`, `GRAFANA_ADMIN_PASSWORD` и задайте `DOMAIN`. Затем запустите сервисы и один раз загрузите синтетические демонстрационные данные:

```bash
pnpm docker:up
pnpm docker:seed
```

`docker:seed` запускает одноразовый контейнер. Он не создаёт дубликаты, но при каждом запуске возвращает три исходные демо-заявки к начальным статусам. Запускайте seed перед новой демонстрацией, а не при каждом старте приложения.

При значениях `DOMAIN=localhost` и `SCHEME=http` откройте:

| Раздел | Адрес |
| --- | --- |
| Кабинет предпринимателя | http://localhost |
| Кабинет сотрудника банка | http://backoffice.localhost |
| Swagger API | http://api.localhost/docs |
| Проверка API | http://api.localhost/health |

Для входа выберите демонстрационный профиль. Тестовые профили: `bakery` (ООО «Пекарня на Лесной»), `workshop` (ИП Столяров) и `logistics` (ООО «Тестовые перевозки»). Сотрудник входит как «Аналитик Демо 1», руководитель для управляющих действий как «Руководитель Демо». Пароли для этих профилей не нужны.

Остановить сервисы, сохранив данные PostgreSQL:

```bash
pnpm docker:down
```

Чтобы удалить базу и начать заново, выполните `docker compose --env-file infra/prod/.env -f infra/prod/docker-compose.yml down --volumes`. Команда удаляет сохранённые заявки, события и сессии.

## Основной сценарий проверки

1. В кабинете предпринимателя войдите в профиль `bakery`, создайте заявку на оборотный кредит и отправьте её.
2. В банковском АРМ войдите как «Аналитик Демо 1», откройте очередь и разберите заявку.
3. Для существующей заявки попробуйте запросить сведения, ответьте на него из кабинета клиента и продолжите рассмотрение в АРМ.
4. Проверьте принятие предложения, подготовку договора и моделируемое подписание. В демо после ввода одноразового кода заявка получает статус `FUNDED`; выдача денег реальным банком не выполняется.

Данные для проверки через API: [`docs/api-collection/company-profile.postman_collection.json`](docs/api-collection/company-profile.postman_collection.json). После импорта сначала выполните вход из коллекции: Postman сохранит cookie для запросов к тому же `baseUrl`. Переменные коллекции позволяют выбрать локальный или опубликованный API.

Сквозной тест подачи заявки до `FUNDED`:

Один раз установите пакеты и браузер Playwright:

```bash
pnpm install
pnpm exec playwright install chromium
```

В первом терминале подготовьте PostgreSQL и синтетические данные:

```bash
pnpm db:up
pnpm --filter api db:seed
```

Во втором терминале запустите scoring и оставьте его работающим:

```bash
pnpm --filter scoring dev
```

В третьем терминале запустите тест:

```bash
pnpm test:e2e tests/e2e/financing-cycle.smoke.mjs
```

Конфигурация Playwright сама запускает API, Client Web и Backoffice Web. Scoring отвечает на `http://localhost:8000`, PostgreSQL остаётся на `localhost:5432`.

## Локальная разработка

```bash
pnpm install
pnpm db:up
pnpm --filter api db:seed
pnpm dev
```

`pnpm dev` запускает API, оба веб-приложения и scoring через Turborepo. Адреса: Client Web `http://localhost:3000`, Backoffice Web `http://localhost:3001`, API и Swagger `http://localhost:4000/docs`, scoring `http://localhost:8000/docs`. Остановить PostgreSQL: `pnpm db:down`.

Чтобы запустить scoring вручную, перейдите в `apps/scoring` и выполните `uv run --locked uvicorn app.main:app --host 127.0.0.1 --port 8000`. Внешние API-ключи для демо не требуются. Настройки API и Compose описаны в `apps/api/.env.example` и `infra/prod/.env.example`.

## Архитектура и материалы проверки

- [Публичная документация и быстрый старт](docs/prod/site/docs/quick-start.mdx)
- [Четыре архитектурных представления](docs/prod/site/docs/developers/architecture.mdx)
- [Модель данных](docs/prod/site/docs/developers/data-model.mdx)
- [Сценарии проверки](docs/prod/site/docs/developers/verification-scenarios.mdx)
- [Диаграмма состояний заявки](docs/prod/site/docs/submission/state-machine-demo.mdx)
- [API и коллекция Postman](docs/prod/site/docs/developers/api.mdx)
- [Описание сторонних компонентов и лицензий](THIRD_PARTY_NOTICES)

Сайт документации запускается отдельно:

```bash
cd docs/prod/site
npm ci
npm run dev
```

## Проверки разработки

```bash
pnpm lint
pnpm check-types
pnpm build
pnpm boundaries
pnpm --filter api test
pnpm --filter client test
```

API-тесты, проверяющие транзакции PostgreSQL, требуют работающую базу и `TEST_DATABASE_URL=postgres://alfa:alfa@localhost:5432/alfa`. Точный список проверок и окружение CI см. в [workflow](.github/workflows/ci.yml).

## Мониторинг

Для необязательного профиля мониторинга задайте `GRAFANA_ADMIN_PASSWORD` в `infra/prod/.env`, затем выполните `pnpm docker:monitoring:up`. Grafana доступна на `http://127.0.0.1:3002`, Prometheus на `http://127.0.0.1:9090`; оба порта привязаны к loopback. Подробности и ограничения метрик приведены в [production Compose](infra/prod/docker-compose.yml).
