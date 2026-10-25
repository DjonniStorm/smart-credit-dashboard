# Client reports API

Все ручки требуют cookie демо-сессии клиента. Они возвращают только заявки компании текущей сессии.

- `GET /v1/client-reports?status=...&limit=...&cursor=...` — список заявок. Ответ содержит `items`, `nextCursor` и `watermark`.
- `GET /v1/client-reports/:id` — публичная история заявки: timeline и changes. Внутренние события и служебные поля не выдаются.
- `GET /v1/client-reports/export.csv` — тот же отфильтрованный список в RFC 4180 CSV с `Content-Disposition: attachment`.

`cursor` непрозрачный и подписан сервером; клиент должен передавать его без изменения.
