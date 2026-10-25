export const reportDataSql = `
-- Search is literal (wildcards are escaped); API bounds period and length.
with raw as (
  select v.*,
    case when coalesce(v.event_status, 'unknown') in ('draft', 'in_review', 'needs_client', 'approved', 'counter_offer', 'accepted', 'signing', 'funded', 'rejected', 'cancelled') then coalesce(v.event_status, 'unknown') else 'unknown' end as status_value,
    case when coalesce(v.event_stage, 'unknown') in ('intake', 'completeness', 'enrichment', 'scoring', 'decision', 'signing', 'disbursement') then coalesce(v.event_stage, 'unknown') else 'unknown' end as stage_value,
    coalesce(v.event_assignee_id, 'unassigned') as assignee_value,
    case when coalesce(v.actor_kind, 'unknown') in ('employee', 'system', 'client') then v.actor_kind else 'unknown' end as actor_value,
    case when v.autonomy_mode in ('shadow', 'assist', 'controlled') then v.autonomy_mode else 'unknown' end as autonomy_value,
    case when v.hold_state = 'active' then 'paused' when v.event_stage is null and v.hold_state is null then 'unknown' when v.sla_state in ('on_track', 'at_risk', 'overdue') then v.sla_state else 'unknown' end as sla_value,
    case when coalesce(v.event_recommendation, prior.event_recommendation, 'unknown') in ('approve', 'counter_offer', 'request_info', 'manual_review', 'reject') then coalesce(v.event_recommendation, prior.event_recommendation) else 'unknown' end as recommendation
  from manager_report_events v
  left join lateral (
    select p.event_recommendation
      from manager_report_events p
     where p.application_id = v.application_id
       and p.event_recommendation is not null
       and p.kind like 'scoring%'
       and p.report_seq <= $3::bigint
       and (p.occurred_at, p.report_seq) < (v.occurred_at, v.report_seq)
     order by p.occurred_at desc, p.report_seq desc
     limit 1
  ) prior on true
  where v.occurred_at >= $1 and v.occurred_at < $2
), search_term as (
  select replace(replace(replace(lower($14::text), chr(92), chr(92) || chr(92)), chr(37), chr(92) || chr(37)), chr(95), chr(92) || chr(95)) as needle
), bounded as (
  select raw.* from raw cross join search_term
  where report_seq <= $3::bigint
    and ($4::bigint is null or report_seq <= $4::bigint)
), filtered as (
  select bounded.* from bounded cross join search_term
  where (cardinality($5::text[]) = 0 or product_id = any($5::text[]))
    and (cardinality($6::text[]) = 0 or status_value = any($6::text[]))
    and (cardinality($7::text[]) = 0 or assignee_value = any($7::text[]))
    and (cardinality($8::text[]) = 0 or stage_value = any($8::text[]))
    and (cardinality($9::text[]) = 0 or actor_value = any($9::text[]))
    and (cardinality($10::text[]) = 0 or recommendation = any($10::text[]))
    and (cardinality($11::text[]) = 0 or autonomy_value = any($11::text[]))
    and (cardinality($12::text[]) = 0 or autonomy_disposition = any($12::text[]))
    and (cardinality($13::text[]) = 0 or sla_value = any($13::text[]))
    and (search_term.needle = '' or lower(application_number) like '%' || search_term.needle || '%' escape chr(92)
      or lower(coalesce(actor_name, '')) like '%' || search_term.needle || '%' escape chr(92)
      or lower(coalesce(payload->>'title', '')) like '%' || search_term.needle || '%' escape chr(92)
      or lower(coalesce(payload->>'comment', '')) like '%' || search_term.needle || '%' escape chr(92))
), population as (
  select a.id, a.number, a.created_at, a.product_id, a.amount, a.urgent,
    latest.event_status as status_value,
    latest.event_stage as stage_value,
    latest.event_assignee_id as assignee_value
  from applications a
  left join lateral (
    select
      (select v.event_status from manager_report_events v
        where v.application_id = a.id and v.source = 'event'
          and v.event_status is not null and v.occurred_at < $2::timestamptz
          and v.report_seq <= $3::bigint
        order by v.occurred_at desc, v.report_seq desc limit 1) as event_status,
      (select v.event_stage from manager_report_events v
        where v.application_id = a.id and v.source = 'event'
          and v.event_stage is not null and v.occurred_at < $2::timestamptz
          and v.report_seq <= $3::bigint
        order by v.occurred_at desc, v.report_seq desc limit 1) as event_stage,
      (select v.event_assignee_id from manager_report_events v
        where v.application_id = a.id and v.source = 'event'
          and v.event_assignee_id is not null and v.occurred_at < $2::timestamptz
          and v.report_seq <= $3::bigint
        order by v.occurred_at desc, v.report_seq desc limit 1) as event_assignee_id
  ) latest on true
  where a.created_at >= $1 and a.created_at < $2
    and (cardinality($5::text[]) = 0 or a.product_id = any($5::text[]))
    and (cardinality($6::text[]) = 0 or coalesce(latest.event_status, 'unknown') = any($6::text[]))
    and (cardinality($7::text[]) = 0 or coalesce(latest.event_assignee_id, 'unassigned') = any($7::text[]))
    and (cardinality($8::text[]) = 0 or coalesce(latest.event_stage, 'unknown') = any($8::text[]))
    and ($14::text = '' or lower(a.number) like '%' || (select needle from search_term) || '%' escape chr(92))
), activity_page as (
  select * from filtered
  where $15::timestamptz is null
     or (occurred_at, report_seq) < ($15::timestamptz, $16::bigint)
  order by occurred_at desc, report_seq desc
  limit $17
)
select 'application' as row_type, null::text as event_id, null::bigint as report_seq,
  p.id, p.number as application_number, p.created_at, p.product_id, p.amount, p.urgent,
  p.status_value, p.stage_value, p.assignee_value,
  null::text as application_id, null::timestamptz as occurred_at,
  null::text as kind, null::jsonb as payload, null::text as event_status,
  null::text as event_stage, null::text as event_assignee_id,
  null::text as actor_kind, null::text as actor_id, null::text as actor_name,
  null::text as recommendation, null::text as autonomy_mode,
  null::text as autonomy_disposition, null::text as sla_value,
  null::text as hold_state, null::text as stage_started_at,
  null::integer as sla_target_minutes,
  null::text as source
from population p
where $18::text = 'overview'
union all
select 'event', event_id, report_seq, null, application_number, null, product_id, amount, null,
  null, null, null, application_id, occurred_at, kind, payload, event_status,
  event_stage, event_assignee_id, actor_kind, actor_id, actor_name,
  recommendation, autonomy_mode, autonomy_disposition, sla_value,
  hold_state, stage_started_at, sla_target_minutes, source
from activity_page;
`;
