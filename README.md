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

| Приложение | Адрес |
| --- | --- |
| client: кабинет предпринимателя | http://localhost:3000 |
| backoffice: АРМ сотрудника банка | http://localhost:3001 |
| api, Swagger | http://localhost:4000/docs |
| scoring | http://localhost:8000/docs |
| mocks: БКИ, ЕГРЮЛ/ЕГРИП, ФНС | http://localhost:4100/health |
| PostgreSQL | localhost:5432 |

Порты должны быть свободны.

Один сервис: `pnpm dev --filter=client`. 

Остановить PostgreSQL: `pnpm db:down`.

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