# Модель данных PostgreSQL

Схема взята из `apps/api/src/common/database/migrations/001_workflow.sql`. Таблицы `demo_*` в миграцию не входят: их создаёт `DemoDataStore` при старте api и `pnpm db:seed`. `company_bki_consents` тоже вне миграции: её `CompanyConsentStore` создаёт при первом обращении.

```mermaid
erDiagram
  applications ||--o{ scoring_jobs : "application_id"
  applications ||--o{ application_events : "application_id"
  scoring_jobs ||--o{ source_checks : "job_id"

  applications {
    text id PK
    text number UK
    text inn
    text product_id
    numeric amount
    integer term_months
    text purpose
    text status
    text check_job_id "последняя задача, без FK"
    jsonb scoring
    jsonb decision "рекомендация, правила, режим"
    timestamptz created_at
    timestamptz updated_at
  }

  scoring_jobs {
    text id PK
    text application_id FK
    text status "queued, running, succeeded, failed"
    text idempotency_key "unique вместе с application_id"
    integer attempts
    timestamptz next_attempt_at
    timestamptz created_at
    timestamptz started_at
    timestamptz finished_at
    text error
    jsonb result
  }

  source_checks {
    bigserial id PK
    text job_id FK
    text source
    text status
    jsonb response
    text error
    timestamptz created_at
  }

  application_events {
    bigserial id PK
    text application_id FK
    text kind
    jsonb payload
    timestamptz created_at
  }

  idempotency_keys {
    text scope PK
    text key PK
    text resource_id "id заявки или задачи, без FK"
    timestamptz created_at
  }

  company_bki_consents {
    varchar inn PK
    timestamptz granted_at
  }

  demo_accounts ||--o{ demo_sessions : "account_id"

  demo_accounts {
    text id PK
    jsonb payload
  }

  demo_sessions {
    text token PK
    text account_id FK
    text role
    timestamptz created_at
  }

  demo_employees {
    text id PK
    jsonb payload
  }

  demo_catalog {
    text id PK "всегда default"
    jsonb payload "список продуктов"
  }

  autonomy_policies {
    text product_id PK
    jsonb payload "config и metrics"
  }

  demo_sources {
    text inn PK
    jsonb payload "ЕГРЮЛ, ФНС, БКИ"
  }
```

SVG: [04-data-model.svg](04-data-model.svg)

Доменные сущности без привязки к таблицам: [05-entity-model.md](05-entity-model.md).

## Связи, которых в схеме нет

- `applications.inn`, `company_bki_consents.inn` и `demo_sources.inn` связаны по значению, внешнего ключа нет. Таблицы компаний нет, профиль собирается из `demo_sources`.
- `idempotency_keys.resource_id` указывает на задачу или заявку в зависимости от `scope` (`create` или `check:{applicationId}`).
- Индекс очереди: `scoring_jobs_queue_idx (status, next_attempt_at, created_at)`.
- Сотрудники, продукты, демо-учётки и политики автономности хранятся как jsonb-документы в `demo_*` и `autonomy_policies`, а не нормализованными таблицами. Таблиц документов и согласий по заявке нет.
- Копия DDL для `applications`, `scoring_jobs` и `application_events` есть ещё в `WorkflowStore.onModuleInit` и в `apps/api/scripts/seed-demo.ts`, поэтому схема объявлена в трёх местах.
- В `source_checks` код ничего не пишет и не читает: таблица создана, но ответы источников хранятся только в `application_events` и `scoring_jobs.result`.
