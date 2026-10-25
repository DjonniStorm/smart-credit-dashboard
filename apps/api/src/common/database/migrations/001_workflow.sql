-- Canonical schema for the durable application workflow.
-- Runtime bootstrap remains idempotent for the demo; production applies this file
-- through the migration runner before starting the API.
create table if not exists applications (
  id text primary key, number text not null unique, inn text not null,
  product_id text not null, amount numeric not null, term_months integer not null,
  purpose text not null, status text not null, check_job_id text,
  scoring jsonb, decision jsonb, created_at timestamptz not null, updated_at timestamptz not null
);
alter table applications add column if not exists decision jsonb;
create table if not exists scoring_jobs (
  id text primary key, application_id text not null references applications(id),
  status text not null, idempotency_key text not null, created_at timestamptz not null,
  started_at timestamptz, finished_at timestamptz, error text, result jsonb,
  attempts integer not null default 0, next_attempt_at timestamptz,
  unique(application_id, idempotency_key)
);
create index if not exists scoring_jobs_queue_idx on scoring_jobs(status, next_attempt_at, created_at);
create table if not exists source_checks (
  id bigserial primary key, job_id text not null references scoring_jobs(id),
  source text not null, status text not null, response jsonb, error text,
  created_at timestamptz not null default now()
);
create table if not exists application_events (
  id bigserial primary key, application_id text not null references applications(id),
  kind text not null, payload jsonb not null, created_at timestamptz not null default now()
);
create table if not exists idempotency_keys (
  scope text not null, key text not null, resource_id text not null,
  created_at timestamptz not null default now(), primary key(scope, key)
);
create table if not exists autonomy_policies (
  product_id text primary key,
  payload jsonb not null
);
