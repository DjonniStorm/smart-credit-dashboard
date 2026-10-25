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
- Client и backoffice всегда используют HTTP-адаптеры.
- Синтетические данные загружаются явной идемпотентной командой `pnpm --filter api db:seed`.

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
- Добавлены Brier, log-loss, ECE, ROC-AUC, PR-AUC, KS и isotonic calibration.
- Добавлены temporal train/calibration/test split и bootstrap confidence intervals.
- Добавлен реальный public-proxy trainer и versioned JSON artifact с holdout validation.
- Добавлен shadow endpoint `/v1/models/public-proxy/score` с additive explainability contributions.
- Добавлены PSI drift report, audit-only fairness metrics и artifact validation guards.
- Добавлены endpoints `/v1/models/evaluation`, `/v1/models/registry`, `/v1/models/drift` и `/v1/models/public-proxy/score`.

### 6. Autonomy и Alfi

- Autonomy-контракты и eligibility checks подключены к decision flow.
- Shadow/assist режимы не меняют бизнес-состояние без контролируемого перехода.
- Alfi сохраняет безопасный fallback и может быть включён через controlled adapter после проверки качества.

## Проверки

- TypeScript: API, client, backoffice, contracts — passed.
- ESLint: изменённые TS/TSX/MJS зоны — passed.
- ML/training unit tests: 12/12 passed.
- Python syntax compilation — passed.
- `git diff --check` — passed.

## Ограничения локального запуска

- Полный E2E требует установленного Playwright browser package и поднятого compose-стека.
- Интеграционный сценарий рассчитан на Postgres и локальные API/client/backoffice; в CI он должен запускаться после установки браузеров и seed данных.
- Альфи работает через детерминированный fallback; LLM и внешний endpoint в API-first срез не входят.

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
