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
    health["HealthModule<br/>/health"]
    worker["QueueWorkerService<br/>опрос раз в WORKER_POLL_MS"]
    decision["decide()<br/>детерминированные правила"]
    store["WorkflowStore"]
    storage["StorageService<br/>файлы на диске"]
  end

  subgraph ext["Источники и модель"]
    mocks["apps/mocks :4100<br/>ЕГРЮЛ, ФНС, БКИ"]
    scoring["apps/scoring (Python) :8000<br/>POST /v1/score"]
  end

  db[("PostgreSQL 18")]

  user --> caddy
  employee --> caddy
  caddy -->|"example.ru"| client
  caddy -->|"backoffice.example.ru"| backoffice
  caddy -->|"api.example.ru, /docs"| apiBox
  client -->|"rewrite /api/*"| apiBox
  backoffice -->|"rewrite /api/*"| apiBox

  applications --> store
  worker -->|"claim job"| store
  worker --> applications
  applications --> decision
  applications --> companies
  companies -->|"GET /egrul, /fns, /bki"| mocks
  companies -->|"POST /v1/score"| scoring
  store --> db
  companies -.->|"company_bki_consents"| db
  storage -.-> disk[("STORAGE_ROOT")]
```

SVG: [01-architecture.svg](01-architecture.svg)

## Зависимости

| Откуда                             | Куда          | Как                                                        |
| ---------------------------------- | ------------- | ---------------------------------------------------------- |
| client, backoffice                 | api           | HTTP, `/api/*` проксируется Next.js на `API_URL`           |
| api                                | mocks         | HTTP, таймаут 5 с, три источника запрашиваются параллельно |
| api                                | scoring       | HTTP, `POST /v1/score`                                     |
| api                                | PostgreSQL    | TypeORM, очередь через `FOR UPDATE SKIP LOCKED`            |
| client, backoffice, mocks, scoring | друг с другом | напрямую не общаются                                       |

Типы запросов и ответов лежат в `packages/contracts`, клиент API сгенерирован в `packages/sdk`.

## Что не нарисовано, потому что в коде этого нет

- Отдельного процесса worker нет: `QueueWorkerService` работает внутри процесса api.
- Object storage в compose нет: `StorageService` пишет в локальную папку, MinIO или S3 только заявлены в комментарии.
- Событийного слоя (SSE, шины) нет: изменения состояния попадают в таблицу `application_events`.
- Alfi в `apps/*` нет.
