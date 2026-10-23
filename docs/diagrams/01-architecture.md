# Архитектура компонентов

Схема построена по `infra/prod/docker-compose.yml`, `Caddyfile`, `apps/*/next.config.js` и модулям `apps/api/src`. Порты и имена сервисов взяты из конфигурации.

```mermaid
flowchart LR
  user["Предприниматель"]
  employee["Сотрудник банка"]

  subgraph edge["Вход"]
    caddy["Caddy<br/>:80 / :443"]
  end

  subgraph web["Web (Next.js)"]
    client["apps/client<br/>кабинет :3000"]
    backoffice["apps/backoffice<br/>АРМ :3001"]
  end

  subgraph apiBox["apps/api (NestJS) :4000"]
    direction TB
    applications["ApplicationsModule<br/>/v1/applications, /v1/jobs"]
    companies["CompaniesModule<br/>/v1/companies"]
    auth["AuthModule<br/>/v1/auth, демо-сессии"]
    catalog["CatalogModule<br/>/v1/products, /v1/employees"]
    autonomy["AutonomyStore<br/>политики автономности"]
    health["HealthModule<br/>/health"]
    worker["QueueWorkerService<br/>опрос раз в WORKER_POLL_MS"]
    decision["decide()<br/>детерминированные правила"]
    store["WorkflowStore"]
    demo["DemoDataStore<br/>синтетические данные"]
    storage["StorageService<br/>файлы на диске"]
  end

  seed["pnpm --filter api db:seed<br/>запускается вручную"]
  scoring["apps/scoring (Python) :8000<br/>POST /v1/score"]
  db[("PostgreSQL 18")]
  disk[("STORAGE_ROOT")]

  user --> caddy
  employee --> caddy
  caddy -->|"example.ru"| client
  caddy -->|"backoffice.example.ru"| backoffice
  caddy -->|"api.example.ru, /docs"| apiBox
  client -->|"rewrite /api/*"| apiBox
  backoffice -->|"rewrite /api/*"| apiBox

  applications --> store
  applications --> decision
  applications --> companies
  applications --> autonomy
  worker -->|"claim job"| store
  worker --> applications
  auth --> demo
  catalog --> demo
  companies --> demo
  companies -->|"POST /v1/score"| scoring
  store --> db
  demo -->|"demo_*"| db
  autonomy -->|"autonomy_policies"| db
  seed -.->|"demo_*, autonomy_policies, 3 заявки"| db
  companies -.->|"company_bki_consents"| db
  storage -.-> disk
```

SVG: [01-architecture.svg](01-architecture.svg)

## Зависимости

| Откуда                      | Куда                | Как                                                              |
| --------------------------- | ------------------- | ---------------------------------------------------------------- |
| client, backoffice          | api                 | HTTP, `/api/*` проксируется Next.js на `API_URL`                 |
| api                         | scoring             | HTTP, `POST /v1/score`, таймаут 5 с                              |
| api                         | PostgreSQL          | TypeORM, очередь через `FOR UPDATE SKIP LOCKED`                  |
| api                         | `autonomy_policies` | снимок политики и метрик для `GET /v1/applications/{id}/context` |
| client, backoffice, scoring | друг с другом       | напрямую не общаются                                             |

Типы запросов и ответов лежат в `packages/contracts`, клиент API сгенерирован в `packages/sdk`.

## Что не нарисовано, потому что в коде этого нет

- Seed не входит ни в compose, ни в `apps/api/Dockerfile`. После `docker compose up` таблицы `demo_*` пусты: нет демо-учёток, нет `demo_sources`, и каждая задача скоринга после трёх попыток падает с «Синтетические источники не найдены». Пока seed не выполнен вручную, контур в Docker не работает.
- ЕГРЮЛ, ФНС и БКИ не отдельный сервис: `apps/mocks` удалён, `CompaniesService` читает ответы источников из таблицы `demo_sources`, которую заполняет `pnpm db:seed`.
- Отдельного процесса worker нет: `QueueWorkerService` работает внутри процесса api.
- Object storage в compose нет: `StorageService` пишет в локальную папку.
- Событийного слоя (SSE, шины) нет: изменения состояния попадают в таблицу `application_events`.
- Alfi в `apps/*` нет.
