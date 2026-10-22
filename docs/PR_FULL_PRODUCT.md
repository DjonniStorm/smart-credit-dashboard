## Что сделано

### 1. Durable workflow: queue, worker, migrations, storage

- Добавлен PostgreSQL-backed worker с атомарным claim через `FOR UPDATE SKIP LOCKED`.
- HTTP-запрос больше не выполняет scoring синхронно.
- Добавлены retry/backoff, attempts, next attempt time, terminal failure и сохранение ошибок.
- Добавлена canonical SQL migration `001_workflow.sql` для applications, jobs, source checks, events и idempotency keys.
- Добавлен локальный filesystem storage adapter с безопасной нормализацией ключей; API совместим с будущим S3/MinIO adapter.
- Добавлены env-параметры worker/storage/logging.

### 2. Client и backoffice API integration

- HTTP adapter включён по умолчанию в client cabinet и backoffice.
- Мок включается только явным флагом `NEXT_PUBLIC_CABINET_API=mock` или `NEXT_PUBLIC_ARM_API=mock`.
- Существующие UI могут работать с теми же контрактами без переключения кода.

### 3. E2E без моков

- Добавлен Playwright config для API, client и backoffice.
- Добавлен smoke-сценарий создания заявки, повторного idempotent запроса, запуска проверки и polling до terminal status.
- В CI добавлены API tests и scoring tests.

### 4. Scoring → decision engine → audit

- Добавлен детерминированный decision engine поверх ML-рекомендации.
- В audit сохраняются recommendation, model, reasons, rules и autonomy mode.
- Решение разделяет `shadow`, `assist` и controlled режимы.

### 5. ML challenger, calibration, explainability, drift

- Добавлены champion/challenger evaluation.
- Добавлены Brier, log-loss, ECE, AUC и isotonic calibration.
- Добавлен PSI drift report.
- Добавлены explainability metadata и versioned feature snapshot.
- Добавлены endpoints `/v1/models/evaluation` и `/v1/models/drift`.

### 6. Autonomy и Alfi

- Autonomy-контракты и eligibility checks подключены к decision flow.
- Shadow/assist режимы не меняют бизнес-состояние без контролируемого перехода.
- Alfi сохраняет безопасный fallback и может быть включён через controlled adapter после проверки качества.

## Проверки

- TypeScript: API, client, backoffice, contracts — passed.
- ESLint: изменённые TS/TSX/MJS зоны — passed.
- ML unit tests: 5/5 passed.
- Python syntax compilation — passed.
- `git diff --check` — passed.

## Ограничения локального запуска

- Полный E2E требует установленного Playwright browser package и поднятого compose-стека.
- Интеграционный сценарий рассчитан на Postgres и локальные API/client/backoffice; в CI он должен запускаться после установки браузеров и seed данных.
- LLM Alfi остаётся behind adapter: shadow/controlled режимы готовы, production credentials и policy остаются конфигурацией окружения.

## Как проверить

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm check-types
pnpm --filter api test
cd apps/scoring && uv run --locked python -m unittest discover -s tests -v
pnpm exec playwright install --with-deps chromium
pnpm exec playwright test
```
