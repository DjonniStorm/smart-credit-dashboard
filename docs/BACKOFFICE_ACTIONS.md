# Действия банковского АРМ и матрица переходов

Источник истины для demo/mock-режима: `packages/contracts/src/application.ts` и `apps/backoffice/src/shared/api/arm/mock/flow.ts`.

## Состояния

`status` — бизнес-результат заявки (`in_review`, `needs_client`, `counter_offer`, `approved`, `disbursed`, `rejected`). `stage` — этап конвейера. `waitingOn` — участник, от которого ожидается следующий шаг.

Pause/block не меняют эти три поля. Они записываются в `application.hold` и временно замораживают продвижение.

| Hold | Описание |
| --- | --- |
| `null` | заявка активна |
| `{ state: "paused", ... }` | временно остановлена по операционной причине |
| `{ state: "blocked", ... }` | требуется ручное снятие блокировки |

В hold сохраняются причина, автор, время, прежние `waitingOn` и `blocker`. Это позволяет безопасно выполнить `resume` без потери контекста.

## Матрица действий

| Действие | Условие | Результат |
| --- | --- | --- |
| `assign` | активная заявка, не закрыта | меняет ответственного, пишет аудит |
| `rerun_check` | недоступный источник | переводит источник в `pending`, `waitingOn=system` |
| `approve` | `stage=decision`, `waitingOn=employee`, лимит сотрудника | `status=approved`, `stage=signing`, ждём клиента |
| `counter_offer` | `stage=decision`, `waitingOn=employee`, проходит лимиты продукта | `status=counter_offer`, ждём клиента |
| `request_info` | `stage=decision`, `waitingOn=employee` | `status=needs_client`, `stage=completeness`, ждём клиента |
| `reject` | `stage=decision`, `waitingOn=employee` | `status=rejected`, `waitingOn=nobody` |
| `pause` | активная незакрытая заявка | создаёт hold, бизнес-статус не меняется |
| `block` | активная незакрытая заявка | создаёт hold с ручной блокировкой |
| `resume` | есть hold | очищает hold и восстанавливает сохранённые `waitingOn`/`blocker` |
| `comment` | активная заявка | добавляет комментарий с видимостью `client`/`internal`/`handoff` |
| `handoff` | активная незакрытая заявка | сохраняет handoff-пакет, назначает сотрудника, пишет комментарий handoff |
| `cancel` | незакрытая заявка | переводит в закрытый отказ с причиной и аудитом |

При наличии hold разрешён только `resume`. Закрытые заявки (`rejected`, `disbursed`, `waitingOn=nobody`) нельзя поставить на паузу или заблокировать.

## Автоматика и ответы клиента

- `tick` не обрабатывает due-источники и не меняет scoring/decision, если заявка в hold.
- `applyClientResponse` отклоняет ответ клиента, пока заявка в hold.
- UI не показывает demo-ответ клиента при hold.
- После `resume` автоматический этап продолжает работу с сохранённым контекстом; устаревшие `waitingOn` и `blocker` не создаются.

## Аудит

Каждое действие добавляет `ApplicationEvent` с `actor`, `at`, `title`, `comment`, `fromStatus` и `toStatus`. Pause/block/resume не меняют `status`, поэтому их аудит хранится как событие без `fromStatus/toStatus`.

Тип события записывается в `kind`: `status_changed`, `action`, `comment_added`, `handoff` или `hold`.

Проверять аудит можно во вкладке «История» заявки и в разделе «Журнал».
