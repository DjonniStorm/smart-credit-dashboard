# Статусы заявки

В коде четыре словаря, а не один. Ниже каждый из них, связи между ними и переходы по `plan.md`.

| Словарь              | Где                                                                                      | Значения                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Хранимый статус      | `applications.status`, `applicationWorkflowSchema`, `packages/contracts/src/workflow.ts` | `draft`, `in_review`, `needs_client`, `approved`, `rejected`                                                                                     |
| Публичный статус API | `publicApplicationStatusSchema`, `packages/contracts/src/api.ts`                         | `DRAFT`, `SUBMITTED`, `VALIDATING`, `UNDER_REVIEW`, `NEEDS_INFO`, `OFFERED`, `ACCEPTED`, `SIGNING`, `FUNDED`, `REJECTED`, `CANCELLED`, `BLOCKED` |
| Статус в интерфейсах | `applicationStatusSchema`, `packages/contracts/src/index.ts`                             | `draft`, `in_review`, `needs_client`, `counter_offer`, `approved`, `disbursed`, `rejected`                                                       |
| Этап конвейера       | `applicationStageSchema`, `packages/contracts/src/application.ts`                        | `intake`, `completeness`, `enrichment`, `scoring`, `decision`, `signing`, `disbursement`                                                         |

## Как статусы превращаются друг в друга

`apps/api/.../api-mapper.ts` переводит хранимый статус в публичный, а `api-mapper.ts` в `apps/client` и `apps/backoffice` переводит публичный в статус интерфейса. Сплошной показан единственный путь, который проходит в рантайме: в `applications.status` пишется только `in_review` (`ApplicationsService.create`, `scripts/seed-demo.ts`), и ни скоринг, ни воркер статус не меняют. Серые состояния и пунктирные стрелки есть в маппинге, но не достигаются.

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

  d2 ==> p2 ==> u2
  d1 -.-> p1 -.-> u1
  d3 -.-> p3 -.-> u3
  d4 -.-> p4 -.-> u4
  p4 -.->|"offerKind counter"| u5
  d5 -.-> p5 -.-> u6
  p6 -.->|"остальные значения"| u2
  p7 -.-> u7
  p8 -.-> u6

  classDef unused fill:#eee,stroke:#999,color:#555
  class d1,d3,d4,d5,p1,p3,p4,p5,p6,p7,p8,u1,u3,u4,u5,u6,u7 unused
```

SVG: [02-statuses-mapping.svg](02-statuses-mapping.svg)

Три особенности маппинга. API всегда отдаёт `offerKind: initial`, поэтому `counter_offer` в интерфейсах недостижим. Интерфейсы сворачивают `SUBMITTED`, `VALIDATING`, `ACCEPTED`, `SIGNING` и `BLOCKED` в `in_review`, то есть заблокированная или подписываемая заявка выглядела бы как «на рассмотрении». `OFFERED` без `offerKind` превращается в `approved`.

## Где решение видно без смены статуса

Статус остаётся `in_review`, а решение клиент и сотрудник всё равно видят. Оно выводится из скоринга и сохранённой рекомендации.

| Где                                                                        | Откуда берётся                                                                          | Что получается                                                                                                                                                                               |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Кабинет, `decisionOf` в `apps/client/src/shared/api/cabinet/api-mapper.ts` | `scoring.recommendation` при статусе `UNDER_REVIEW`                                     | `decision.outcome`: `approved`, `counter_offer` или `rejected`; для `request_info` и `manual_review` решения нет. Условия оффера: сумма и срок заявки, `ratePercent: 0`, `monthlyPayment: 0` |
| Кабинет, `checksPassed`                                                    | наличие `scoring`                                                                       | `3`, если скоринг есть, иначе `0`                                                                                                                                                            |
| АРМ, `toArmApplication`                                                    | наличие `scoring`                                                                       | `stage: decision`, `waitingOn: employee`; без `scoring` это `scoring` и `system`                                                                                                             |
| АРМ, `GET /v1/applications/{id}/context`                                   | `applications.decision` (пишет `executeJob`), `application_events`, `autonomy_policies` | рекомендация, правила `decide()`, аудит, снимок автономности                                                                                                                                 |

## Публичные статусы и переходы по plan.md

Таблица допустимых переходов из `plan.md` («Статусы и переходы»). В коде её нет: ни в `apps/api`, ни в интерфейсах нет проверки допустимости перехода. Единственная запись статуса: `WorkflowStore.saveApplication` при создании пишет `in_review`. Цветом выделено единственное состояние, в которое заявка попадает при создании: `UNDER_REVIEW`, минуя `DRAFT`, `SUBMITTED` и `VALIDATING`.

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
