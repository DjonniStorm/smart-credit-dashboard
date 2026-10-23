alter table autonomy_policies
  add column if not exists revision bigint not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table applications
  add column if not exists autonomy_case jsonb;

create table if not exists autonomy_policy_audits (
  id bigserial primary key,
  product_id text not null,
  policy_id text not null,
  application_id text references applications(id),
  actor_id text not null,
  actor_role text not null,
  action text not null,
  from_level text not null,
  to_level text not null,
  reason text not null,
  idempotency_key text not null,
  metrics_before jsonb not null,
  metrics_after jsonb not null,
  created_at timestamptz not null default now(),
  unique(product_id, idempotency_key)
);

create index if not exists autonomy_policy_audits_product_idx
  on autonomy_policy_audits(product_id, created_at desc);

create index if not exists autonomy_policy_audits_application_idx
  on autonomy_policy_audits(application_id, created_at desc);
