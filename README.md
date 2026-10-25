Назначение решения, архитектуры, требования к окружению, инструкция по запуску,
конфигурации и переменные окружения, описание используемых компонентов и пошаговый сценарий проверки.

## Требования к окружению

Поставить один раз:

- [Node.js](https://nodejs.org/) 24 или новее
- pnpm 11.25.0: `npm install -g pnpm@11.25.0` (или `corepack enable`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), запущенный

## Запуск для разработки

Из корня репозитория:

```bash
pnpm install
pnpm dev
```

`pnpm dev` поднимает PostgreSQL в Docker (`infra/dev/docker-compose.yml`) и запускает все приложения через Turborepo:

| Приложение                       | Адрес                      |
| -------------------------------- | -------------------------- |
| client: кабинет предпринимателя  | http://localhost:3000      |
| backoffice: АРМ сотрудника банка | http://localhost:3001      |
| api, Swagger                     | http://localhost:4000/docs |
| scoring                          | http://localhost:8000/docs |
| PostgreSQL                       | localhost:5432             |

Порты должны быть свободны.

Один сервис вместе с PostgreSQL: `pnpm dev --filter=client`.

Остановить PostgreSQL: `pnpm db:down`.

Перед первым запуском API заполнить синтетические данные:

```bash
pnpm --filter api db:seed
```

Команда идемпотентна и не запускается автоматически.

Каталог продуктов в базе не хранится: api отдаёт его из `packages/contracts` (`CREDIT_PRODUCTS`). Ключевая ставка для расчёта ставок задаётся переменной `KEY_RATE_PERCENT` (% годовых, по умолчанию 14). Шаблон переменных api: `apps/api/.env.example`.

### Только интерфейс

Посмотреть кабинет и АРМ без Docker и базы:

```bash
pnpm dev:ui
```

Запускает client (http://localhost:3000) и backoffice (http://localhost:3001). Одно приложение: `pnpm exec turbo run dev --filter=client`. Без api страницы открываются, а запросы к нему показывают ошибку: форма проверки ИНН в client и блок «Состояние api» в backoffice. Это нормально.

Тема Mantine, шрифт и пресеты Motion лежат в `packages/ui`. Светлая или тёмная схема берётся из настроек системы.

Сквозной сценарий банковского АРМ с тестовыми заявками и ожидаемыми переходами: [`docs/DEMO_ARM_SCENARIO.md`](docs/DEMO_ARM_SCENARIO.md).
Матрица действий, hold-состояний и правил аудита: [`docs/BACKOFFICE_ACTIONS.md`](docs/BACKOFFICE_ACTIONS.md).
Клиентский сквозной сценарий и UX-контракты: [`docs/CLIENT_CABINET_PLAN.md`](docs/CLIENT_CABINET_PLAN.md).
ML/scoring, калибровка, объяснимость и автономность: [`docs/ML_SCORING_PLAN.md`](docs/ML_SCORING_PLAN.md).
Доменные команды, handoff и аудит: [`docs/application-contracts.md`](docs/application-contracts.md).

## Проверки

```bash
pnpm lint
pnpm check-types
pnpm build
pnpm boundaries
```

`pnpm boundaries` проверяет правила зависимостей: `apps/*` зависят только от `packages/*`, приложения не зависят друг от друга. Те же проверки запускаются в CI на каждый push и pull request.

## Запуск всего в Docker

```bash
pnpm docker:up
```

То же самое, что `docker compose -f infra/prod/docker-compose.yml up --build -d --wait`. Остановить: `pnpm docker:down`.

### Необязательный мониторинг

Мониторинг рассчитан на Linux-хост с Docker. Node Exporter и cAdvisor показывают ресурсы Linux Docker-хоста и контейнеров; в Docker Desktop на Windows это Linux VM, а не ресурсы Windows.

1. Скопируйте `infra/prod/.env.example` в `infra/prod/.env` и задайте непустой `GRAFANA_ADMIN_PASSWORD` (сильный пароль). Файл `.env` локальный и не коммитится.
2. Запустите профиль: `pnpm docker:monitoring:up`. Он поднимает обычный production Compose вместе с Prometheus, Grafana и exporters.
3. На самом сервере откройте `http://127.0.0.1:3002` (Grafana, пользователь `admin`) или `http://127.0.0.1:9090` (Prometheus). Порты доступны только на loopback.
4. Для удалённого доступа используйте SSH-туннель: `ssh -L 3002:127.0.0.1:3002 -L 9090:127.0.0.1:9090 user@server`, затем откройте эти адреса локально.

Prometheus внутри Docker проверяет API `/health` и `/metrics`, scoring `/health`, а также client и backoffice. Публичный маршрут `api.<domain>/metrics` закрыт ответом 404. Правила alerting видны на дашборде, внешняя доставка уведомлений не настроена. `pnpm docker:monitoring:down` останавливает только monitoring-сервисы, не трогая обычные production-сервисы; named volumes и контейнеры мониторинга остаются для следующего запуска.
