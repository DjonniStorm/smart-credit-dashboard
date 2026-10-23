-- Команды сотрудника АРМ: управленческое состояние заявки и комментарии.
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

-- Состояние, которое 003_application_actions.sql складывал в action_state, переезжает в колонки.
-- Колонка action_state остаётся: 003 уже мог быть применён, а откат данных не нужен.
-- Старая блокировка была статусом blocked, теперь это hold поверх прежнего статуса;
-- встречное предложение было approved с offerKind=counter, теперь это counter_offer.
update applications set
  offer = nullif(action_state->'offer', 'null'::jsonb),
  requested_info = coalesce(nullif(action_state->'requestedInfo', 'null'::jsonb), '[]'::jsonb),
  reject_reason = action_state->>'rejectReason',
  assignee_id = action_state->>'assigneeId',
  urgent = coalesce((action_state->>'urgent')::boolean, false),
  urgent_reason = action_state->>'urgentReason',
  handoff = nullif(action_state->'handoff', 'null'::jsonb),
  hold = nullif(action_state->'hold', 'null'::jsonb) - 'previousStatus',
  status = case
    when status = 'blocked' then coalesce(action_state->'hold'->>'previousStatus', 'in_review')
    when status = 'approved' and action_state->>'offerKind' = 'counter' then 'counter_offer'
    else status
  end
where action_state <> '{}'::jsonb;

insert into application_comments(id, application_id, visibility, author, body, created_at)
select c->>'id', a.id, c->>'visibility', c->'author', c->>'body', (c->>'at')::timestamptz
from applications a, jsonb_array_elements(coalesce(a.action_state->'comments', '[]'::jsonb)) c
on conflict (id) do nothing;
