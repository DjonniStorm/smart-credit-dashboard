# Модель данных PostgreSQL

Схема взята из `apps/api/src/common/database/migrations/001_workflow.sql`. Таблица `company_bki_consents` в миграцию не входит: её создаёт `CompanyConsentStore` при первом обращении.

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
```

SVG: [04-data-model.svg](04-data-model.svg)

## Связи, которых в схеме нет

- `applications.inn` и `company_bki_consents.inn` связаны по значению, внешнего ключа нет. Таблицы компаний нет, профиль собирается из источников на лету.
- `idempotency_keys.resource_id` указывает на задачу или заявку в зависимости от `scope` (`create` или `check:{applicationId}`).
- Индекс очереди: `scoring_jobs_queue_idx (status, next_attempt_at, created_at)`.
- Таблиц сотрудников, документов, продуктов и согласий по заявке нет. Продукты, сотрудники и демо-учётки живут в моках приложений и в `packages/contracts`.
- В `source_checks` код ничего не пишет и не читает: таблица создана, но ответы источников хранятся только в `application_events` и `scoring_jobs.result`.
