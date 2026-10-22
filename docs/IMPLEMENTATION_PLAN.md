# План доведения Smart Credit Dashboard до полного сквозного продукта

## Цель

Довести демо-контур до воспроизводимого локального продукта без моков в основном сценарии:
создание заявки, загрузка документов, фоновые проверки, scoring, решение, аудит, оффер,
подписание и выдача. Все внешние интеграции должны иметь безопасный локальный адаптер и
явный режим shadow/assist/production.

## Потоки работ

1. **Workflow/infra** — очередь, worker, миграции, объектное хранилище, retry и наблюдаемость.
2. **Client/backoffice** — HTTP-адаптеры, синхронизация статусов, документы и UI ошибок.
3. **E2E** — Playwright-контур, seed-данные, сквозной сценарий без моков.
4. **Scoring/ML** — decision engine, аудит, challenger, calibration, explainability, drift.
5. **Autonomy/Alfi** — shadow/assist режимы, LLM adapter, redaction, fallback и контроль.

## Порядок интеграции

1. Сначала миграции и durable job execution: ни одна заявка не теряется после рестарта.
2. Затем UI переводится на API и проверяется сквозным тестом.
3. После этого scoring становится источником решения, а не декоративным индикатором.
4. ML challenger и drift включаются в shadow mode; автоматическое решение разрешается только
   при выполнении eligibility-метрик.
5. Alfi сначала работает только в shadow mode, затем в controlled production mode с fallback.
6. Финальный этап — RBAC, PII redaction, traces/metrics, CI, документация и demo seed.

## Definition of Done

- `docker compose up` поднимает API, приложения, Postgres, очередь и MinIO.
- Перезапуск API/worker не теряет заявку или job.
- E2E проходит без UI-моков и фиксирует audit trail.
- Решение содержит score, причины, версию модели и версию правил.
- ML-метрики и drift доступны через health/metrics endpoint.
- Autonomy и Alfi имеют явный режим, аудит переключений и безопасный fallback.
- CI выполняет boundaries, typecheck, lint, unit, integration и E2E.
- README и диаграммы позволяют повторить запуск с чистой машины.
