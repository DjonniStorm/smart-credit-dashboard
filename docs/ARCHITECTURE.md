# Архитектура сквозного контура

```text
Client cabinet ──HTTP──> API ──> PostgreSQL
                              ├─> durable jobs ──> Worker
                              │                    ├─> source adapters
                              │                    └─> scoring/decision engine
                              ├─> object storage (documents)
                              └─> audit/event log

Backoffice ─────HTTP/SSE────> API
Scoring service <───────────> API (versioned model + explanations)
Alfi adapter ───────────────> API (shadow/assist/controlled production)
```

## Границы ответственности

- **Client** отвечает за ввод данных, документы, оффер и подписание. Источник истины — API.
- **Backoffice** отвечает за обработку заявки и ручные действия. Решение нельзя изменить без
  audit event с actor, reason и correlation id.
- **API** владеет state machine заявки, идемпотентностью, authorization и публикацией jobs.
- **Worker** выполняет внешние проверки и scoring с retry/timeout/dead-letter.
- **Scoring** возвращает версионированный результат и объяснение, но не меняет статус сам.
- **Decision engine** применяет правила продукта и пишет итоговое решение в audit.
- **Alfi** не имеет права принимать кредитное решение; в production mode его действия ограничены
  разрешёнными командами и проходят валидацию схемы.

## Безопасность

- PII хранится только в API/storage, во внешние ML/LLM вызовы уходит redacted payload.
- Все upload/download идут через signed URL и проверку MIME, размера и checksum.
- Доступ проверяется по роли и tenant/company scope.
- Audit events append-only; корреляция проходит через `request_id` и `application_id`.
- Shadow mode не меняет бизнес-состояние; assist mode требует подтверждения сотрудника.

## Наблюдаемость

Минимальные метрики: `job_duration_ms`, `job_retry_total`, `queue_depth`, `source_check_error_total`,
`scoring_latency_ms`, `decision_total`, `model_drift_psi`, `alfi_fallback_total`. Логи структурированы
JSON и не содержат исходные документы или незамаскированные идентификаторы.
