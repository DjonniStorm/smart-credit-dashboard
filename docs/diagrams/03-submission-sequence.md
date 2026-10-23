# Подача заявки, скоринг и решение

Последовательность построена по `ApplicationsController`, `ApplicationsService`, `QueueWorkerService`, `WorkflowStore`, `CompaniesService` и `decide()` в `apps/api`.

## Что делает api сейчас

```mermaid
sequenceDiagram
  autonumber
  actor C as Клиент
  participant W as client (Next.js)
  participant A as api
  participant DB as PostgreSQL
  participant Q as QueueWorkerService
  participant M as mocks
  participant S as scoring

  C->>W: подаёт заявку
  W->>A: POST /v1/applications (idempotencyKey)
  A->>DB: idempotency_keys: ключ уже есть?
  alt ключ новый
    A->>DB: applications (status in_review)
    A->>DB: scoring_jobs (status queued)
    A->>DB: idempotency_keys, application_events application_created
  end
  A-->>W: application и checkJob
  W-->>C: заявка принята

  loop каждые WORKER_POLL_MS
    Q->>DB: claim: queued - running, FOR UPDATE SKIP LOCKED
  end
  Q->>A: processJob(job)
  par три источника, таймаут 5 с
    A->>M: GET /egrul/{inn}
    A->>M: GET /fns/{inn}
    A->>M: GET /bki/{inn}
  end
  A->>S: POST /v1/score (inn, egrul, bki, fns)
  S-->>A: score, risk_band, readiness_index, confidence, recommendation
  A->>A: decide(): правила поверх рекомендации модели
  alt успех
    A->>DB: applications.scoring, scoring_jobs succeeded
    A->>DB: application_events scoring_succeeded (rules, reasons, autonomyMode)
  else ошибка источника или scoring
    Note over A,DB: attempts меньше 3: queued с задержкой min(60 с, 2^attempts с)<br/>иначе failed, событие scoring_failed
  end

  W->>A: GET /v1/jobs/{id}
  A-->>W: status и result
```

SVG: [03-sequence-api.svg](03-sequence-api.svg)

Рекомендации `decide()`: `reject`, `request_info`, `counter_offer`, `approve` (только при confidence не ниже 0,8 и сумме до 5 000 000), иначе `manual_review`. Режим автономности в текущем коде `shadow` или `assist`. Рекомендация записывается в событие, статус заявки она не меняет.

## Как это продолжается в АРМ

Менеджер видит заявку и принимает решение в интерфейсе `apps/backoffice`. Его HTTP-адаптер ходит на `/api/arm/*`, и этих ручек в `apps/api` нет, поэтому ниже поток по контракту `packages/contracts/src/application.ts`, как его выполняет мок-движок `apps/backoffice/src/shared/api/arm/mock`.

```mermaid
sequenceDiagram
  autonumber
  actor E as Сотрудник
  participant B as backoffice
  participant A as api (/arm, нет в коде)
  actor C as Клиент

  B->>A: GET /arm/applications
  A-->>B: очередь: stage decision, waitingOn employee
  E->>B: открывает карточку, смотрит рекомендацию и правила
  alt approve
    E->>B: одобрить
    B->>A: EmployeeAction approve
    Note over A: статус approved, этап signing
    C->>A: подписывает договор
    Note over A: статус disbursed, выдача смоделирована
  else counter_offer
    B->>A: EmployeeAction counter_offer
    Note over A: статус counter_offer
    C->>A: принимает условия
    Note over A: статус approved
  else request_info
    B->>A: EmployeeAction request_info
    Note over A: статус needs_client
    C->>A: присылает документы
    Note over A: in_review, источники запрашиваются заново
  else reject
    B->>A: EmployeeAction reject (причина)
    Note over A: статус rejected
  end
```

SVG: [03-sequence-backoffice.svg](03-sequence-backoffice.svg)
