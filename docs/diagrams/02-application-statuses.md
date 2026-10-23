# Статусы заявки

В коде четыре словаря, а не один. Ниже каждый из них, связи между ними и переходы по `plan.md`.

| Словарь              | Где                                                                                      | Значения                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Хранимый статус      | `applications.status`, `applicationWorkflowSchema`, `packages/contracts/src/workflow.ts` | `draft`, `in_review`, `needs_client`, `approved`, `rejected`                                                                                     |
| Публичный статус API | `publicApplicationStatusSchema`, `packages/contracts/src/api.ts`                         | `DRAFT`, `SUBMITTED`, `VALIDATING`, `UNDER_REVIEW`, `NEEDS_INFO`, `OFFERED`, `ACCEPTED`, `SIGNING`, `FUNDED`, `REJECTED`, `CANCELLED`, `BLOCKED` |
| Статус в интерфейсах | `applicationStatusSchema`, `packages/contracts/src/index.ts`                             | `draft`, `in_review`, `needs_client`, `counter_offer`, `approved`, `disbursed`, `rejected`                                                       |
| Этап конвейера       | `applicationStageSchema`, `packages/contracts/src/application.ts`                        | `intake`, `completeness`, `enrichment`, `scoring`, `decision`, `signing`, `disbursement`                                                         |

## Как статусы превращаются друг в друга

`apps/api/.../api-mapper.ts` переводит хранимый статус в публичный, а `api-mapper.ts` в `apps/client` и `apps/backoffice` переводит публичный в статус интерфейса. Сплошные стрелки это то, что код делает сейчас. Серые состояния в API никто не выставляет, значения есть только в контракте.

```mermaid
flowchart LR
  subgraph db["PostgreSQL: applications.status"]
    d1["draft"]
    d2["in_review"]
    d3["needs_client"]
    d4["approved"]
    d5["rejected"]
  end

  subgraph api["API: публичный статус"]
    p1["DRAFT"]
    p2["UNDER_REVIEW"]
    p3["NEEDS_INFO"]
    p4["OFFERED"]
    p5["REJECTED"]
    p6["SUBMITTED, VALIDATING,<br/>ACCEPTED, SIGNING, BLOCKED"]
    p7["FUNDED"]
    p8["CANCELLED"]
  end

  subgraph ui["Интерфейсы: статус"]
    u1["draft"]
    u2["in_review"]
    u3["needs_client"]
    u4["approved"]
    u5["counter_offer"]
    u6["rejected"]
    u7["disbursed"]
  end

  d1 --> p1 --> u1
  d2 --> p2 --> u2
  d3 --> p3 --> u3
  d4 --> p4 --> u4
  p4 -.->|"offerKind counter"| u5
  d5 --> p5 --> u6
  p6 -->|"остальные значения"| u2
  p7 --> u7
  p8 --> u6

  classDef unused fill:#eee,stroke:#999,color:#555
  class p6,p7,p8,u5,u7 unused
```

SVG: [02-statuses-mapping.svg](02-statuses-mapping.svg)

Две особенности маппинга. API всегда отдаёт `offerKind: initial`, поэтому `counter_offer` в интерфейсах недостижим. Интерфейсы сворачивают `SUBMITTED`, `VALIDATING`, `ACCEPTED`, `SIGNING` и `BLOCKED` в `in_review`, то есть заблокированная или подписываемая заявка выглядит как «на рассмотрении».

## Публичные статусы и переходы по plan.md

Таблица допустимых переходов из `plan.md` («Статусы и переходы»). В коде её нет: ни в `apps/api`, ни в интерфейсах нет проверки допустимости перехода. Единственная запись статуса: `WorkflowStore.saveApplication` при создании пишет `in_review`. Цветом выделено состояние, в которое заявка попадает при создании: `UNDER_REVIEW`, минуя `DRAFT`, `SUBMITTED` и `VALIDATING`.

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> SUBMITTED: клиент подал
  DRAFT --> CANCELLED: клиент отозвал
  SUBMITTED --> VALIDATING: система, сразу
  VALIDATING --> UNDER_REVIEW: проверки и scoring готовы
  VALIDATING --> NEEDS_INFO: открыт запрос клиенту
  UNDER_REVIEW --> NEEDS_INFO: менеджер открыл запрос
  NEEDS_INFO --> UNDER_REVIEW: ответ на все запросы
  UNDER_REVIEW --> OFFERED: approve или counter-offer
  UNDER_REVIEW --> REJECTED: менеджер, причина обязательна
  OFFERED --> ACCEPTED: клиент принял
  OFFERED --> CANCELLED: клиент отклонил
  OFFERED --> UNDER_REVIEW: менеджер перехватил
  ACCEPTED --> SIGNING: договор подготовлен
  SIGNING --> FUNDED: клиент подтвердил
  state "любой нефинальный" as ANY
  ANY --> CANCELLED: менеджер, CANCEL
  ANY --> BLOCKED: менеджер, BLOCK
  BLOCKED --> ANY: старший менеджер, UNBLOCK
  REJECTED --> [*]
  CANCELLED --> [*]
  FUNDED --> [*]

  classDef reachable fill:#cfe8ff,stroke:#2b6cb0
  class UNDER_REVIEW reachable
```

SVG: [02-statuses-public.svg](02-statuses-public.svg)

Встречное предложение остаётся `OFFERED` с признаком `isCounterOffer` (в контракте это `offerKind: counter`). Пауза и срочность управляющие признаки, а не статусы.

## Этапы конвейера

Этап показывает сотруднику, где заявка в конвейере. В коде его нет в хранилище: `apps/backoffice/.../arm/api-mapper.ts` выводит его из наличия `scoring`.

| Условие                | `stage`    | `waitingOn` |
| ---------------------- | ---------- | ----------- |
| у заявки нет `scoring` | `scoring`  | `system`    |
| `scoring` есть         | `decision` | `employee`  |

Остальные этапы (`intake`, `completeness`, `enrichment`, `signing`, `disbursement`) есть в схеме и в интерфейсах, но API их не вычисляет. Восемь внутренних стадий из `plan.md` (`ENRICHING`, `SCORING`, `MANUAL_REVIEW` и другие) в коде не заведены вообще.
