-- Единая историческая последовательность отчёта для событий и комментариев.
create sequence if not exists report_event_seq;

alter table application_events add column if not exists report_seq bigint;
alter table application_comments add column if not exists report_seq bigint;
alter table application_events add column if not exists event_key text;

create temporary table report_seq_backfill (
  source_kind text not null,
  source_id text not null,
  seq bigint not null,
  primary key (source_kind, source_id)
) on commit drop;

with existing_max as (
  select greatest(
    coalesce((select max(report_seq) from application_events), 0),
    coalesce((select max(report_seq) from application_comments), 0)
  ) as base
), ordered as (
  select 'event'::text as source_kind, id::text as source_id, created_at as occurred_at
  from application_events
  where report_seq is null
  union all
  select 'comment', id::text, created_at
  from application_comments
  where report_seq is null
), numbered as (
  select source_kind, source_id,
    (row_number() over (order by occurred_at, source_kind, source_id) + existing_max.base)::bigint as seq
  from ordered cross join existing_max
)
insert into report_seq_backfill(source_kind, source_id, seq)
select source_kind, source_id, seq from numbered;

update application_events e
set report_seq = b.seq
from report_seq_backfill b
where b.source_kind = 'event' and b.source_id = e.id::text;

update application_comments c
set report_seq = b.seq
from report_seq_backfill b
where b.source_kind = 'comment' and b.source_id = c.id::text;

select setval(
  'report_event_seq',
  greatest(
    1,
    coalesce((select max(report_seq) from application_events), 0),
    coalesce((select max(report_seq) from application_comments), 0)
  ),
  greatest(
    coalesce((select max(report_seq) from application_events), 0),
    coalesce((select max(report_seq) from application_comments), 0)
  ) > 0
);

alter table application_events alter column report_seq set default nextval('report_event_seq');
alter table application_comments alter column report_seq set default nextval('report_event_seq');
alter table application_events alter column report_seq set not null;
alter table application_comments alter column report_seq set not null;

create or replace function assign_report_seq()
returns trigger language plpgsql as $$
begin
  if new.report_seq is null then
    new.report_seq := nextval('report_event_seq');
  end if;
  return new;
end;
$$;

drop trigger if exists application_events_report_seq_trigger on application_events;
create trigger application_events_report_seq_trigger
before insert on application_events
for each row execute function assign_report_seq();

drop trigger if exists application_comments_report_seq_trigger on application_comments;
create trigger application_comments_report_seq_trigger
before insert on application_comments
for each row execute function assign_report_seq();

-- Старые строки получают стабильный ключ; новые записи передают ключ из seed/runtime.
delete from application_events as duplicate
using application_events as original
where duplicate.payload->>'seedKey' is not null
  and duplicate.payload->>'seedKey' = original.payload->>'seedKey'
  and (duplicate.created_at, duplicate.id) > (original.created_at, original.id);
update application_events
set event_key = payload->>'seedKey'
where event_key is null and payload->>'seedKey' is not null;
update application_events
set event_key = 'legacy-' || id::text
where event_key is null;

create unique index if not exists application_events_event_key_idx
  on application_events (event_key);
create unique index if not exists application_events_event_key_all_idx
  on application_events (event_key);
create unique index if not exists application_events_report_seq_idx
  on application_events (report_seq);
create unique index if not exists application_comments_report_seq_idx
  on application_comments (report_seq);
create index if not exists application_events_projection_cursor_idx
  on application_events (created_at desc, report_seq desc);
create index if not exists application_events_projection_application_idx
  on application_events (application_id, created_at, report_seq);
create index if not exists application_events_projection_kind_idx
  on application_events (kind, created_at, report_seq);
create index if not exists application_comments_report_cursor_idx
  on application_comments (created_at desc, report_seq desc);

do $$
declare
  row_count bigint;
  distinct_count bigint;
begin
  select count(*) into row_count
  from (
    select report_seq from application_events
    union all
    select report_seq from application_comments
  ) rows;
  select count(distinct report_seq) into distinct_count
  from (
    select report_seq from application_events
    union all
    select report_seq from application_comments
  ) rows;
  if row_count <> distinct_count then
    raise exception 'Дубли report_seq в projection manager reports';
  end if;
end;
$$;

drop view if exists manager_report_events;

create table if not exists manager_report_activity (
  report_seq bigint primary key,
  event_id text not null unique,
  application_id text not null,
  application_number text not null,
  occurred_at timestamptz not null,
  kind text not null,
  payload jsonb not null,
  product_id text not null,
  amount numeric not null,
  event_status text,
  event_stage text,
  event_assignee_id text,
  actor_kind text,
  actor_id text,
  actor_name text,
  event_recommendation text,
  autonomy_mode text,
  autonomy_disposition text,
  sla_state text,
  hold_state text,
  stage_started_at text,
  sla_target_minutes integer,
  source text not null check (source in ('event', 'comment'))
);

create index if not exists manager_report_activity_cursor_idx
  on manager_report_activity (occurred_at desc, report_seq desc);
create index if not exists manager_report_activity_application_idx
  on manager_report_activity (application_id, occurred_at, report_seq);
-- pg_trgm ускоряет номер заявки, а остальные поля получают ограниченный fallback:
-- API ограничивает период 366 днями и строку поиска 200 символами.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm') then
    execute 'create index if not exists manager_report_activity_number_trgm_idx
      on manager_report_activity using gin (lower(application_number) gin_trgm_ops)';
  end if;
end;
$$;

insert into manager_report_activity (
  report_seq, event_id, application_id, application_number, occurred_at,
  kind, payload, product_id, amount, event_status, event_stage,
  event_assignee_id, actor_kind, actor_id, actor_name, event_recommendation,
  autonomy_mode, autonomy_disposition, sla_state, hold_state, stage_started_at,
  sla_target_minutes, source
)
select
  e.report_seq, e.report_seq::text, e.application_id, a.number, e.created_at,
  e.kind, e.payload, a.product_id, a.amount,
  coalesce(nullif(e.payload #>> '{reportContext,status}', ''), nullif(e.payload->>'status', '')),
  coalesce(nullif(e.payload #>> '{reportContext,stage}', ''), nullif(e.payload->>'stage', '')),
  coalesce(nullif(e.payload #>> '{reportContext,assigneeId}', ''), nullif(e.payload->>'assigneeId', '')),
  coalesce(nullif(e.payload #>> '{reportContext,actorKind}', ''), nullif(e.payload->>'actorKind', '')),
  coalesce(nullif(e.payload #>> '{reportContext,actorId}', ''), nullif(e.payload->>'actorId', '')),
  coalesce(nullif(e.payload #>> '{reportContext,actorName}', ''), nullif(e.payload->>'actorName', '')),
  coalesce(nullif(e.payload #>> '{reportContext,recommendation}', ''), nullif(e.payload->>'recommendation', '')),
  coalesce(nullif(e.payload #>> '{reportContext,autonomyMode}', ''), nullif(e.payload->>'autonomyMode', '')),
  coalesce(nullif(e.payload #>> '{reportContext,autonomyDisposition}', ''), nullif(e.payload->>'autonomyDisposition', '')),
  coalesce(nullif(e.payload #>> '{reportContext,slaState}', ''), nullif(e.payload->>'slaState', '')),
  coalesce(nullif(e.payload #>> '{reportContext,holdState}', ''), nullif(e.payload->>'holdState', '')),
  coalesce(nullif(e.payload #>> '{reportContext,stageStartedAt}', ''), nullif(e.payload->>'stageStartedAt', '')),
  case when coalesce(nullif(e.payload #>> '{reportContext,slaTargetMinutes}', ''), nullif(e.payload->>'slaTargetMinutes', '')) ~ '^[0-9]+$'
    then coalesce(nullif(e.payload #>> '{reportContext,slaTargetMinutes}', ''), nullif(e.payload->>'slaTargetMinutes', ''))::integer end,
  'event'
from application_events e
join applications a on a.id = e.application_id
union all
select
  c.report_seq, c.report_seq::text, c.application_id, a.number, c.created_at,
  'comment_added', jsonb_build_object(
    'comment', c.body,
    'title', case when c.visibility = 'handoff' then 'Комментарий для передачи' else 'Добавлен комментарий' end
  ), a.product_id, a.amount, null, null, null,
  nullif(c.author->>'kind', ''), nullif(c.author->>'id', ''), nullif(c.author->>'name', ''),
  null, null, null, null, null, null, null, 'comment'
from application_comments c
join applications a on a.id = c.application_id
on conflict (report_seq) do update set
  event_id = excluded.event_id,
  application_id = excluded.application_id,
  application_number = excluded.application_number,
  occurred_at = excluded.occurred_at,
  kind = excluded.kind,
  payload = excluded.payload,
  product_id = excluded.product_id,
  amount = excluded.amount,
  event_status = excluded.event_status,
  event_stage = excluded.event_stage,
  event_assignee_id = excluded.event_assignee_id,
  actor_kind = excluded.actor_kind,
  actor_id = excluded.actor_id,
  actor_name = excluded.actor_name,
  event_recommendation = excluded.event_recommendation,
  autonomy_mode = excluded.autonomy_mode,
  autonomy_disposition = excluded.autonomy_disposition,
  sla_state = excluded.sla_state,
  hold_state = excluded.hold_state,
  stage_started_at = excluded.stage_started_at,
  sla_target_minutes = excluded.sla_target_minutes,
  source = excluded.source;

create or replace function manager_report_project_event()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    delete from manager_report_activity where report_seq = old.report_seq;
    return old;
  end if;
  insert into manager_report_activity (
    report_seq, event_id, application_id, application_number, occurred_at,
    kind, payload, product_id, amount, event_status, event_stage,
    event_assignee_id, actor_kind, actor_id, actor_name, event_recommendation,
    autonomy_mode, autonomy_disposition, sla_state, hold_state, stage_started_at,
    sla_target_minutes, source
  )
  select
    new.report_seq, new.report_seq::text, new.application_id, a.number, new.created_at,
    new.kind, new.payload, a.product_id, a.amount,
    coalesce(nullif(new.payload #>> '{reportContext,status}', ''), nullif(new.payload->>'status', '')),
    coalesce(nullif(new.payload #>> '{reportContext,stage}', ''), nullif(new.payload->>'stage', '')),
    coalesce(nullif(new.payload #>> '{reportContext,assigneeId}', ''), nullif(new.payload->>'assigneeId', '')),
    coalesce(nullif(new.payload #>> '{reportContext,actorKind}', ''), nullif(new.payload->>'actorKind', '')),
    coalesce(nullif(new.payload #>> '{reportContext,actorId}', ''), nullif(new.payload->>'actorId', '')),
    coalesce(nullif(new.payload #>> '{reportContext,actorName}', ''), nullif(new.payload->>'actorName', '')),
    coalesce(nullif(new.payload #>> '{reportContext,recommendation}', ''), nullif(new.payload->>'recommendation', '')),
    coalesce(nullif(new.payload #>> '{reportContext,autonomyMode}', ''), nullif(new.payload->>'autonomyMode', '')),
    coalesce(nullif(new.payload #>> '{reportContext,autonomyDisposition}', ''), nullif(new.payload->>'autonomyDisposition', '')),
    coalesce(nullif(new.payload #>> '{reportContext,slaState}', ''), nullif(new.payload->>'slaState', '')),
    coalesce(nullif(new.payload #>> '{reportContext,holdState}', ''), nullif(new.payload->>'holdState', '')),
    coalesce(nullif(new.payload #>> '{reportContext,stageStartedAt}', ''), nullif(new.payload->>'stageStartedAt', '')),
    case when coalesce(nullif(new.payload #>> '{reportContext,slaTargetMinutes}', ''), nullif(new.payload->>'slaTargetMinutes', '')) ~ '^[0-9]+$'
      then coalesce(nullif(new.payload #>> '{reportContext,slaTargetMinutes}', ''), nullif(new.payload->>'slaTargetMinutes', ''))::integer end,
    'event'
  from applications a where a.id = new.application_id
  on conflict (report_seq) do update set
    event_id = excluded.event_id, application_id = excluded.application_id,
    application_number = excluded.application_number, occurred_at = excluded.occurred_at,
    kind = excluded.kind, payload = excluded.payload, product_id = excluded.product_id,
    amount = excluded.amount, event_status = excluded.event_status,
    event_stage = excluded.event_stage, event_assignee_id = excluded.event_assignee_id,
    actor_kind = excluded.actor_kind, actor_id = excluded.actor_id,
    actor_name = excluded.actor_name, event_recommendation = excluded.event_recommendation,
    autonomy_mode = excluded.autonomy_mode, autonomy_disposition = excluded.autonomy_disposition,
    sla_state = excluded.sla_state, hold_state = excluded.hold_state,
    stage_started_at = excluded.stage_started_at, sla_target_minutes = excluded.sla_target_minutes,
    source = excluded.source;
  return new;
end;
$$;

create or replace function manager_report_project_comment()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    delete from manager_report_activity where report_seq = old.report_seq;
    return old;
  end if;
  insert into manager_report_activity (
    report_seq, event_id, application_id, application_number, occurred_at,
    kind, payload, product_id, amount, actor_kind, actor_id, actor_name, source
  )
  select new.report_seq, new.report_seq::text, new.application_id, a.number, new.created_at,
    'comment_added', jsonb_build_object(
      'comment', new.body,
      'title', case when new.visibility = 'handoff' then 'Комментарий для передачи' else 'Добавлен комментарий' end
    ), a.product_id, a.amount, nullif(new.author->>'kind', ''),
    nullif(new.author->>'id', ''), nullif(new.author->>'name', ''), 'comment'
  from applications a where a.id = new.application_id
  on conflict (report_seq) do update set
    event_id = excluded.event_id, application_id = excluded.application_id,
    application_number = excluded.application_number, occurred_at = excluded.occurred_at,
    kind = excluded.kind, payload = excluded.payload, product_id = excluded.product_id,
    amount = excluded.amount, event_status = null, event_stage = null,
    event_assignee_id = null, actor_kind = excluded.actor_kind,
    actor_id = excluded.actor_id, actor_name = excluded.actor_name,
    event_recommendation = null, autonomy_mode = null, autonomy_disposition = null,
    sla_state = null, hold_state = null, stage_started_at = null,
    sla_target_minutes = null, source = excluded.source;
  return new;
end;
$$;

drop trigger if exists manager_report_activity_event_trigger on application_events;
create trigger manager_report_activity_event_trigger
after insert or update or delete on application_events
for each row execute function manager_report_project_event();
drop trigger if exists manager_report_activity_comment_trigger on application_comments;
create trigger manager_report_activity_comment_trigger
after insert or update or delete on application_comments
for each row execute function manager_report_project_comment();

create or replace function rebuild_manager_report_activity()
returns void language plpgsql as $$
begin
  delete from manager_report_activity p
   where (p.source = 'event' and not exists (
            select 1 from application_events e where e.report_seq = p.report_seq
          ))
      or (p.source = 'comment' and not exists (
            select 1 from application_comments c where c.report_seq = p.report_seq
          ));
  -- No-op updates intentionally invoke the projection triggers. They upsert every
  -- source row and therefore repair missing or stale metadata deterministically.
  update application_events set payload = payload where report_seq is not null;
  update application_comments set body = body where report_seq is not null;
end;
$$;

select rebuild_manager_report_activity();

create or replace function manager_report_refresh_application()
returns trigger language plpgsql as $$
begin
  update manager_report_activity
     set application_number = new.number, product_id = new.product_id, amount = new.amount
   where application_id = new.id;
  return new;
end;
$$;

drop trigger if exists manager_report_activity_application_trigger on applications;
create trigger manager_report_activity_application_trigger
after update of number, product_id, amount on applications
for each row execute function manager_report_refresh_application();

do $$
declare
  event_count bigint;
  projected_event_count bigint;
  comment_count bigint;
  projected_comment_count bigint;
begin
  select count(*) into event_count from application_events;
  select count(*) into projected_event_count from manager_report_activity where source = 'event';
  select count(*) into comment_count from application_comments;
  select count(*) into projected_comment_count from manager_report_activity where source = 'comment';
  if event_count <> projected_event_count or comment_count <> projected_comment_count then
    raise exception 'Неполная projection manager reports: events %, comments %', event_count, comment_count;
  end if;
  if exists (
    select 1
    from application_events e
    join applications a on a.id = e.application_id
    left join manager_report_activity p
      on p.report_seq = e.report_seq and p.source = 'event'
    where p.report_seq is null
       or p.application_id <> e.application_id
       or p.application_number <> a.number
       or p.occurred_at <> e.created_at
       or p.kind <> e.kind
       or p.payload <> e.payload
       or p.product_id <> a.product_id
       or p.amount <> a.amount
  ) or exists (
    select 1
    from application_comments c
    join applications a on a.id = c.application_id
    left join manager_report_activity p
      on p.report_seq = c.report_seq and p.source = 'comment'
    where p.report_seq is null
       or p.application_id <> c.application_id
       or p.application_number <> a.number
       or p.occurred_at <> c.created_at
       or p.kind <> 'comment_added'
       or p.payload->>'comment' <> c.body
       or p.product_id <> a.product_id
       or p.amount <> a.amount
  ) then
    raise exception 'Расхождение source и projection manager reports';
  end if;
  if exists (select 1 from manager_report_activity where report_seq is null or event_id is null) then
    raise exception 'Пустые ключи в projection manager reports';
  end if;
end;
$$;

create or replace view manager_report_events as
select report_seq, event_id, application_id, application_number, occurred_at,
  kind, payload, product_id, amount, event_status, event_stage,
  event_assignee_id, actor_kind, actor_id, actor_name, event_recommendation,
  autonomy_mode, autonomy_disposition, sla_state, hold_state, stage_started_at,
  sla_target_minutes, source
from manager_report_activity;
