# Database migrations

Схема меняется только новыми файлами `NNN_name.sql`; применённые файлы не правятся.
`runMigrations` (`../migration-runner.ts`) запускается при старте API, держит advisory lock,
применяет каждый файл один раз в своей транзакции и пишет его имя в `schema_migrations`.
`nest build` копирует `*.sql` в `dist` (`assets` в `nest-cli.json`).

Очередь работает на PostgreSQL через `FOR UPDATE SKIP LOCKED`: несколько реплик API не берут одну задачу дважды.
Задачи в `running` дольше `JOB_LEASE_MS` возвращаются в очередь или переходят в `failed`.
