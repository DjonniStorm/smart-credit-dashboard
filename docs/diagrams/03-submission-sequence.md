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
  participant S as scoring

  C->>W: подаёт заявку
  W->>A: POST /v1/applications (idempotencyKey)
  A->>DB: idempotency_keys: ключ уже есть?
  alt ключ новый
    A->>DB: applications (status in_review)
    A->>DB: scoring_jobs (status queued)
    A->>DB: idempotency_keys, application_events application_created
  end
  A-->>W: application (UNDER_REVIEW) и checkJob
  W-->>C: заявка принята

  loop каждые WORKER_POLL_MS
    Q->>DB: claim: queued - running, FOR UPDATE SKIP LOCKED
  end
  Q->>A: processJob(job)
  A->>DB: demo_sources: ЕГРЮЛ, ФНС, БКИ по ИНН
  A->>S: POST /v1/score (inn, egrul, bki, fns, сумма, срок)
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

Рекомендации `decide()`: `reject`, `request_info`, `counter_offer`, `approve` (только при confidence не ниже 0,8 и сумме до 5 000 000), иначе `manual_review`. Режим автономности в текущем коде `shadow` или `assist`. Рекомендация попадает в событие и в `scoring`, статус заявки она не меняет: после скоринга заявка остаётся `in_review`.

## АРМ: что есть и чего нет

АРМ читает очередь через `GET /v1/applications` и показывает заявку на этапе решения, когда скоринг готов. Команды сотрудника в api не реализованы: `act` и `simulateClient` в `apps/backoffice/src/shared/api/arm/http-api.ts` выбрасывают ошибку «появятся после подключения команд API». Пунктирные стрелки ниже это путь по `plan.md`, его в коде нет.

```mermaid
sequenceDiagram
  autonumber
  actor E as Сотрудник
  participant B as backoffice
  participant A as api
  actor C as Клиент

  B->>A: GET /v1/applications
  A-->>B: заявки, scoring в поле scoring
  Note over B: stage decision, waitingOn employee выводятся из наличия scoring
  E->>B: открывает карточку, смотрит рекомендацию и правила
  E-->>B: approve, counter_offer, request_info или reject
  B--xA: команда сотрудника (в api нет)
  A--xC: оффер, запрос документов или отказ (в api нет)
  C--xA: принять, ответить, подписать (в api нет)
```

SVG: [03-sequence-backoffice.svg](03-sequence-backoffice.svg)
