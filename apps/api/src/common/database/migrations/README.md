# Database migrations

`001_workflow.sql` is the canonical schema for the workflow store. The current
demo bootstrap keeps an idempotent `CREATE TABLE` fallback in `WorkflowStore`;
production startup must apply numbered files before enabling the API.

The queue is PostgreSQL-backed and uses `FOR UPDATE SKIP LOCKED`, so multiple
worker replicas can safely consume jobs without duplicate execution.
