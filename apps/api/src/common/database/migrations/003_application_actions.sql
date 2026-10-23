alter table applications add column if not exists action_state jsonb not null default '{}'::jsonb;

create index if not exists application_events_kind_idx
  on application_events(application_id, kind, created_at);
