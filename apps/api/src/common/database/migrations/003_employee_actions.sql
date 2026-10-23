-- Команды сотрудника АРМ: управленческое состояние заявки, комментарии, сессии сотрудников.
-- Статус остаётся бизнес-результатом, пауза и блокировка лежат в hold.
alter table applications add column if not exists offer jsonb;
alter table applications add column if not exists requested_info jsonb not null default '[]';
alter table applications add column if not exists reject_reason text;
alter table applications add column if not exists hold jsonb;
alter table applications add column if not exists urgent boolean not null default false;
alter table applications add column if not exists urgent_reason text;
alter table applications add column if not exists assignee_id text;
alter table applications add column if not exists handoff jsonb;
create table if not exists application_comments (
  id text primary key, application_id text not null references applications(id),
  visibility text not null, author jsonb not null, body text not null,
  created_at timestamptz not null default now()
);
create index if not exists application_comments_app_idx on application_comments(application_id, created_at);
