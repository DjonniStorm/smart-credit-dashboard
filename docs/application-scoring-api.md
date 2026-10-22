# API заявки и фоновой scoring job

Контракт workflow находится в `@repo/contracts/workflow`.

## Сквозной сценарий

1. `POST /v1/applications` принимает заявку и обязательный `idempotencyKey`.
2. API создаёт заявку со статусом `in_review`, ставит job проверки в очередь и
   возвращает `application` вместе с `checkJob.id`.
3. `GET /v1/jobs/:id` используется для polling. Состояния: `queued`, `running`,
   `succeeded`, `failed`.
4. После успеха результат baseline scoring записывается в заявку и доступен через
   `GET /v1/applications/:id`.
5. `POST /v1/applications/:id/checks` запускает повторную проверку. Повтор с
   тем же `idempotencyKey` возвращает ту же job и не вызывает scoring повторно.

Idempotency scope: ключ создания уникален для операции создания, ключ проверки
уникален внутри заявки. В текущей демо-реализации хранилище in-memory; перед
production его нужно заменить на таблицы applications/jobs с unique constraint
по `(application_id, idempotency_key)` и транзакционным claim job.

Ошибки источников и scoring переводят job в `failed`, сохраняют безопасное
сообщение в `error` и не изменяют scoring заявки. Сырые ответы внешних систем в
job не сохраняются.
