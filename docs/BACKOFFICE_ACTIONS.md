# Действия банковского АРМ и матрица переходов

Источник истины для API-режима: `plan.md`, `packages/contracts/src/api.ts` и API workflow-контракты.

## Состояния

`status` — бизнес-результат заявки (`in_review`, `needs_client`, `counter_offer`, `approved`, `disbursed`, `rejected`). `stage` — этап конвейера. `waitingOn` — участник, от которого ожидается следующий шаг.

Pause/block не меняют эти три поля. Они записываются в `application.hold` и временно замораживают продвижение.

| Hold                        | Описание                                     |
| --------------------------- | -------------------------------------------- |
| `null`                      | заявка активна                               |
| `{ state: "paused", ... }`  | временно остановлена по операционной причине |
| `{ state: "blocked", ... }` | требуется ручное снятие блокировки           |

В hold сохраняются причина, автор, время, прежние `waitingOn` и `blocker`. Это позволяет безопасно выполнить `resume` без потери контекста.

## Команды сотрудника в API

Все действия идут через `POST /v1/applications/{id}/actions` с телом `{ action: EmployeeAction, idempotencyKey }`.
Ручка требует сессию сотрудника (cookie `alfa_employee_session`, вход `POST /v1/auth/employee-sign-in`);
без неё ответ 401. Очередь АРМ читается через `GET /v1/applications/queue` и тоже закрыта сессией.

- Контроллер отправляет `ApplyApplicationActionCommand` в `CommandBus`, хендлер зовёт `ApplicationActionsService`; автор команды берётся из сессии сотрудника, `employeeId` в теле нет.
- Решение (`approve`, `counter_offer`, `reject`), расходящееся с рекомендацией по заявке, требует непустого комментария: иначе 422.
- Каждая команда проходит через `runCommand` (`apps/api/src/modules/applications/application-commands.ts`):
  статус меняется только там и только по разрешённым переходам. Запрещённый переход, пауза, блокировка или закрытая
  заявка дают 409, лимит одобрения и снятие блокировки не руководителем дают 403, условия вне лимитов продукта дают 422.
- Заявка блокируется строкой (`select ... for update`), команда и запись в `application_events` идут одной транзакцией.
- Повтор с тем же `idempotencyKey` не выполняется второй раз и возвращает актуальное состояние.
- `stage`, `waitingOn` и `blocker` выводятся из статуса и готовности скоринга (`application-flow.ts`) и не хранятся:
  результат проверок, пришедший на паузе, не оставляет заявку с устаревшим ожиданием.
- Пауза и блокировка лежат в `applications.hold`, публичный статус блокировки отдаётся как `BLOCKED`,
  бизнес-статус остаётся в `management.businessStatus`.
- Комментарии лежат в `application_comments`; клиенту уходят только с видимостью `client`.

Ответы клиента (принять предложение, подписать договор) в этот контур не входят: их делает кабинет клиента.

## Матрица действий

| Действие        | Условие                                                          | Результат                                                                |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `assign`        | активная заявка, не закрыта                                      | меняет ответственного, пишет аудит                                       |
| `rerun_check`   | недоступный источник                                             | переводит источник в `pending`, `waitingOn=system`                       |
| `approve`       | `stage=decision`, `waitingOn=employee`, лимит сотрудника         | `status=approved`, `stage=signing`, ждём клиента                         |
| `counter_offer` | `stage=decision`, `waitingOn=employee`, проходит лимиты продукта | `status=counter_offer`, ждём клиента                                     |
| `request_info`  | `stage=decision`, `waitingOn=employee`                           | `status=needs_client`, `stage=completeness`, ждём клиента                |
| `reject`        | `stage=decision`, `waitingOn=employee`                           | `status=rejected`, `waitingOn=nobody`                                    |
| `pause`         | активная незакрытая заявка                                       | создаёт hold, бизнес-статус не меняется                                  |
| `block`         | активная незакрытая заявка                                       | создаёт hold с ручной блокировкой                                        |
| `resume`        | есть hold                                                        | очищает hold и восстанавливает сохранённые `waitingOn`/`blocker`         |
| `comment`       | активная заявка                                                  | добавляет комментарий с видимостью `client`/`internal`/`handoff`         |
| `handoff`       | активная незакрытая заявка                                       | сохраняет handoff-пакет, назначает сотрудника, пишет комментарий handoff |
| `cancel`        | незакрытая заявка                                                | переводит в закрытый отказ с причиной и аудитом                          |

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
