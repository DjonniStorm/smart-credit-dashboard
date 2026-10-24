/** Полный SQL summary для overview. Сырые строки периода в Node не передаются. */
export const reportAggregateSql = `
-- Search is literal (wildcards are escaped). The API bounds it to
-- 200 characters and the report period to 366 days when pg_trgm is absent.
with raw_all as (
  select v.*,
    case when coalesce(v.event_status, 'unknown') in ('draft', 'in_review', 'needs_client', 'approved', 'counter_offer', 'accepted', 'signing', 'funded', 'rejected', 'cancelled') then coalesce(v.event_status, 'unknown') else 'unknown' end as status_value,
    case when coalesce(v.event_stage, 'unknown') in ('intake', 'completeness', 'enrichment', 'scoring', 'decision', 'signing', 'disbursement') then coalesce(v.event_stage, 'unknown') else 'unknown' end as stage_value,
    coalesce(v.event_assignee_id, 'unassigned') as assignee_value,
    case when coalesce(v.actor_kind, 'unknown') in ('employee', 'system', 'client') then v.actor_kind else 'unknown' end as actor_value,
    case when v.autonomy_mode in ('shadow', 'assist', 'controlled') then v.autonomy_mode else 'unknown' end as autonomy_value,
    case when v.hold_state = 'active' then 'paused' when v.event_stage is null and v.hold_state is null then 'unknown' when v.sla_state in ('on_track', 'at_risk', 'overdue') then v.sla_state else 'unknown' end as sla_value,
    case when coalesce(v.event_recommendation, prior.event_recommendation, 'unknown') in ('approve', 'counter_offer', 'request_info', 'manual_review', 'reject') then coalesce(v.event_recommendation, prior.event_recommendation) else 'unknown' end as recommendation,
    case when v.autonomy_disposition in ('manual_required', 'auto_offer_sent', 'confirmed', 'intercepted', 'expired', 'declined') then v.autonomy_disposition else null end as normalized_autonomy_disposition
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
  where v.report_seq <= $3::bigint
), search_term as (
  select replace(replace(replace(lower($13::text), chr(92), chr(92) || chr(92)), chr(37), chr(92) || chr(37)), chr(95), chr(92) || chr(95)) as needle
), raw as (
  select * from raw_all
  where occurred_at >= $1 and occurred_at < $2
), filtered as (
  select raw.* from raw cross join search_term
  where (cardinality($4::text[]) = 0 or product_id = any($4::text[]))
    and (cardinality($5::text[]) = 0 or status_value = any($5::text[]))
    and (cardinality($6::text[]) = 0 or assignee_value = any($6::text[]))
    and (cardinality($7::text[]) = 0 or stage_value = any($7::text[]))
    and (cardinality($8::text[]) = 0 or actor_value = any($8::text[]))
    and (cardinality($9::text[]) = 0 or recommendation = any($9::text[]))
    and (cardinality($10::text[]) = 0 or autonomy_value = any($10::text[]))
    and (cardinality($11::text[]) = 0 or normalized_autonomy_disposition = any($11::text[]))
    and (cardinality($12::text[]) = 0 or sla_value = any($12::text[]))
    and (search_term.needle = '' or lower(application_number) like '%' || search_term.needle || '%' escape chr(92)
      or lower(coalesce(actor_name, '')) like '%' || search_term.needle || '%' escape chr(92)
      or lower(coalesce(payload->>'title', '')) like '%' || search_term.needle || '%' escape chr(92)
      or lower(coalesce(payload->>'comment', '')) like '%' || search_term.needle || '%' escape chr(92))
), population as (
  select a.id, a.number, a.created_at, a.product_id, a.amount, a.urgent,
    case when coalesce(latest.event_status, 'unknown') in ('draft', 'in_review', 'needs_client', 'approved', 'counter_offer', 'accepted', 'signing', 'funded', 'rejected', 'cancelled') then coalesce(latest.event_status, 'unknown') else 'unknown' end as status_value,
    case when coalesce(latest.event_stage, 'unknown') in ('intake', 'completeness', 'enrichment', 'scoring', 'decision', 'signing', 'disbursement') then coalesce(latest.event_stage, 'unknown') else 'unknown' end as stage_value,
    coalesce(latest.event_assignee_id, 'unassigned') as assignee_value
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
    and (cardinality($4::text[]) = 0 or a.product_id = any($4::text[]))
    and (cardinality($5::text[]) = 0 or coalesce(latest.event_status, 'unknown') = any($5::text[]))
    and (cardinality($6::text[]) = 0 or coalesce(latest.event_assignee_id, 'unassigned') = any($6::text[]))
    and (cardinality($7::text[]) = 0 or coalesce(latest.event_stage, 'unknown') = any($7::text[]))
    and ($13::text = '' or lower(a.number) like '%' || (select needle from search_term) || '%' escape chr(92))
), baseline as (
  select distinct on (application_id) *
  from raw_all
  where source = 'event'
    and kind <> 'scoring_failed'
    and occurred_at < $1
  order by application_id, occurred_at desc, report_seq desc
), baseline_filtered as (
  select baseline.* from baseline
  where exists (
    select 1 from population p where p.id = baseline.application_id
  )
), event_observations as (
  select * from filtered
  where source = 'event' and kind <> 'scoring_failed'
), sla_timeline as (
  select raw.*, false as is_baseline from raw
  where source = 'event'
    and kind <> 'scoring_failed'
    and exists (select 1 from population p where p.id = raw.application_id)
  union all
  select baseline_filtered.*, true as is_baseline from baseline_filtered
  where source = 'event' and kind <> 'scoring_failed'
), stage_events as (
  select e.*,
    lag(e.stage_value) over (
      partition by e.application_id order by e.occurred_at, e.report_seq
    ) as previous_stage
  from sla_timeline e
), stage_marked as (
  select e.*,
    sum(case when e.previous_stage is distinct from e.stage_value then 1 else 0 end)
      over (partition by e.application_id order by e.occurred_at, e.report_seq) as segment_no
  from stage_events e
), stage_segments as (
  select application_id, segment_no, stage_value,
    greatest(min(occurred_at), $1::timestamptz) as started_at,
    coalesce(lead(min(occurred_at)) over (
      partition by application_id order by min(occurred_at), segment_no
    ), $2::timestamptz) as ended_at
  from stage_marked
  group by application_id, segment_no, stage_value
), stage_latest as (
  select distinct on (application_id, segment_no)
    application_id, segment_no, hold_state, sla_value, sla_target_minutes
  from stage_marked
  order by application_id, segment_no, occurred_at desc, report_seq desc
), hold_events as (
  select e.*,
    lag(e.hold_state) over (
      partition by e.application_id order by e.occurred_at, e.report_seq
    ) as previous_hold
  from sla_timeline e
), hold_marked as (
  select e.*,
    sum(case when e.previous_hold is distinct from e.hold_state then 1 else 0 end)
      over (partition by e.application_id order by e.occurred_at, e.report_seq) as hold_no
  from hold_events e
), hold_runs as (
  select application_id, hold_no, max(hold_state) as hold_state,
    min(occurred_at) as started_at
  from hold_marked
  group by application_id, hold_no
), hold_intervals as (
  select h.*,
    lead(h.started_at) over (
      partition by h.application_id order by h.started_at, h.hold_no
    ) as ended_at
  from hold_runs h
), sla_segments as (
  select s.application_id, s.segment_no, s.stage_value,
    case
      when s.stage_value = 'unknown' then 'unknown'
      when latest.hold_state = 'active' then 'paused'
      when latest.sla_target_minutes is null and s.stage_value = 'intake' then
        case when elapsed.effective_minutes > 240 then 'overdue' when elapsed.effective_minutes > 192 then 'at_risk' else 'on_track' end
      when latest.sla_target_minutes is null and s.stage_value = 'completeness' then
        case when elapsed.effective_minutes > 480 then 'overdue' when elapsed.effective_minutes > 384 then 'at_risk' else 'on_track' end
      when latest.sla_target_minutes is null and s.stage_value = 'enrichment' then
        case when elapsed.effective_minutes > 240 then 'overdue' when elapsed.effective_minutes > 192 then 'at_risk' else 'on_track' end
      when latest.sla_target_minutes is null and s.stage_value = 'scoring' then
        case when elapsed.effective_minutes > 60 then 'overdue' when elapsed.effective_minutes > 48 then 'at_risk' else 'on_track' end
      when latest.sla_target_minutes is null and s.stage_value = 'decision' then
        case when elapsed.effective_minutes > 240 then 'overdue' when elapsed.effective_minutes > 192 then 'at_risk' else 'on_track' end
      when latest.sla_target_minutes is null and s.stage_value = 'signing' then
        case when elapsed.effective_minutes > 1440 then 'overdue' when elapsed.effective_minutes > 1152 then 'at_risk' else 'on_track' end
      when latest.sla_target_minutes is null and s.stage_value = 'disbursement' then
        case when elapsed.effective_minutes > 1440 then 'overdue' when elapsed.effective_minutes > 1152 then 'at_risk' else 'on_track' end
      when latest.sla_target_minutes is null then 'unknown'
      when elapsed.effective_minutes > latest.sla_target_minutes then 'overdue'
      when elapsed.effective_minutes > latest.sla_target_minutes * 0.8 then 'at_risk'
      else 'on_track'
    end as state,
    s.started_at as bucket_at
  from stage_segments s
  join stage_latest latest using (application_id, segment_no)
  cross join lateral (
    select greatest(0::numeric,
      extract(epoch from (s.ended_at - s.started_at)) / 60 - coalesce((
        select sum(extract(epoch from (
          least(coalesce(h.ended_at, s.ended_at), s.ended_at) - greatest(h.started_at, s.started_at)
        )) / 60)
        from hold_intervals h
        where h.application_id = s.application_id and h.hold_state = 'active'
          and h.started_at < s.ended_at
          and coalesce(h.ended_at, s.ended_at) > s.started_at
      ), 0)) as effective_minutes
  ) elapsed
), population_product as (
  select p.product_id, count(*)::integer as applications,
    count(*) filter (where p.status_value not in ('rejected', 'cancelled', 'funded'))::integer as active,
    count(*) filter (where p.status_value in ('rejected', 'cancelled', 'funded'))::integer as closed,
    count(*) filter (where p.urgent and p.status_value not in ('rejected', 'cancelled', 'funded'))::integer as urgent_open,
    count(*) filter (where exists (
      select 1 from sla_segments s where s.application_id = p.id and s.state = 'overdue'
    ))::integer as overdue
  from population p
  group by p.product_id
), decisions as (
  select *, payload->>'actionType' as decision,
    case when stage_started_at is null or stage_started_at !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then null else
      extract(epoch from (occurred_at - stage_started_at::timestamptz)) / 60 end as decision_minutes
  from filtered
  where payload->>'actionType' in ('approve', 'counter_offer', 'reject', 'request_info')
), buckets as (
  select distinct bucket from (
    select case when $15::text = 'week'
      then date_trunc('week', created_at at time zone $14::text) at time zone $14::text
      else date_trunc('day', created_at at time zone $14::text) at time zone $14::text end as bucket
    from population
    union
    select case when $15::text = 'week'
      then date_trunc('week', occurred_at at time zone $14::text) at time zone $14::text
      else date_trunc('day', occurred_at at time zone $14::text) at time zone $14::text end
    from filtered
  ) keys
), population_status as (
  select status_value as status, count(*)::integer as count
  from population group by status_value
), population_stage as (
  select stage_value as stage, count(*)::integer as count
  from population where stage_value <> 'unknown' group by stage_value
), activity_actor as (
  select actor_value as actor_kind, count(*)::integer as count
  from filtered group by actor_value
), activity_stage as (
  select stage_value as stage, count(*)::integer as count
  from filtered where stage_value <> 'unknown' group by stage_value
), activity_status as (
  select status_value as status, count(*)::integer as count
  from filtered group by status_value
), decision_product as (
  select product_id, count(*)::integer as decisions,
    count(*) filter (where decision = 'approve')::integer as approve,
    count(*) filter (where decision = 'counter_offer')::integer as counter_offer,
    count(*) filter (where decision = 'reject')::integer as reject,
    count(*) filter (where decision = 'request_info')::integer as request_info
  from decisions group by product_id
), recommendation_matrix as (
  select recommendation, decision, count(*)::integer as count
  from decisions group by recommendation, decision
), sla_state as (
  select state, count(*)::integer as count
  from sla_segments group by state
), sla_series as (
  select case when $15::text = 'week'
    then date_trunc('week', bucket_at at time zone $14::text) at time zone $14::text
    else date_trunc('day', bucket_at at time zone $14::text) at time zone $14::text end as bucket_start,
    count(*) filter (where state <> 'unknown')::integer as eligible,
    count(*) filter (where state = 'on_track')::integer as met,
    count(*) filter (where state = 'overdue')::integer as overdue,
    count(*) filter (where state = 'paused')::integer as paused,
    count(*) filter (where state = 'unknown')::integer as unknown
  from sla_segments group by 1
), autonomy_mode as (
  select autonomy_value as mode, count(*)::integer as count
  from event_observations where autonomy_value <> 'unknown' group by autonomy_value
), autonomy_disposition as (
  select normalized_autonomy_disposition as disposition, count(*)::integer as count
  from event_observations where normalized_autonomy_disposition is not null group by normalized_autonomy_disposition
), autonomy_series as (
  select case when $15::text = 'week'
    then date_trunc('week', occurred_at at time zone $14::text) at time zone $14::text
    else date_trunc('day', occurred_at at time zone $14::text) at time zone $14::text end as bucket_start,
    count(*) filter (where kind = 'autonomy_candidate')::integer as candidates,
    count(*) filter (where normalized_autonomy_disposition = 'auto_offer_sent')::integer as auto_offers,
    count(*) filter (where normalized_autonomy_disposition = 'confirmed')::integer as confirmed,
    count(*) filter (where normalized_autonomy_disposition = 'intercepted')::integer as intercepted,
    count(*) filter (where normalized_autonomy_disposition = 'expired')::integer as expired,
    count(*) filter (where normalized_autonomy_disposition = 'declined')::integer as declined,
    count(*) filter (where kind = 'autonomy_override')::integer as overrides
  from event_observations where autonomy_value <> 'unknown' group by 1
), timeseries as (
  select b.bucket,
    (select count(*)::integer from population p where (case when $15::text = 'week'
      then date_trunc('week', p.created_at at time zone $14::text) at time zone $14::text
      else date_trunc('day', p.created_at at time zone $14::text) at time zone $14::text end) = b.bucket) as applications,
    (select count(*)::integer from filtered f where (case when $15::text = 'week'
      then date_trunc('week', f.occurred_at at time zone $14::text) at time zone $14::text
      else date_trunc('day', f.occurred_at at time zone $14::text) at time zone $14::text end) = b.bucket) as events,
    (select count(*)::integer from decisions d where (case when $15::text = 'week'
      then date_trunc('week', d.occurred_at at time zone $14::text) at time zone $14::text
      else date_trunc('day', d.occurred_at at time zone $14::text) at time zone $14::text end) = b.bucket) as decisions,
    (select count(*)::integer from sla_segments s where s.state = 'overdue' and (case when $15::text = 'week'
      then date_trunc('week', s.bucket_at at time zone $14::text) at time zone $14::text
      else date_trunc('day', s.bucket_at at time zone $14::text) at time zone $14::text end) = b.bucket) as overdue
  from buckets b
)
select jsonb_build_object(
  'coverage', jsonb_build_object(
    'population', jsonb_build_object(
      'total', (select count(*)::integer from population),
      'known', (select count(*)::integer from population where status_value <> 'unknown' or stage_value <> 'unknown'),
      'unknown', (select count(*)::integer from population where status_value = 'unknown' and stage_value = 'unknown'),
      'quality', case when (select count(*) from population where status_value = 'unknown' and stage_value = 'unknown') > 0 then 'unknown' else 'complete' end),
    'activity', jsonb_build_object(
      'total', (select count(*)::integer from filtered),
      'known', (select count(*)::integer from filtered where payload ? 'reportContext'),
      'unknown', (select count(*)::integer from filtered where payload = '{}'::jsonb),
      'quality', case when (select count(*) from filtered where payload = '{}'::jsonb) > 0 then 'unknown' when (select count(*) from filtered where not payload ? 'reportContext') > 0 then 'partial' else 'complete' end),
    'recommendation', jsonb_build_object(
      'total', (select count(*)::integer from decisions),
      'known', (select count(*)::integer from decisions where recommendation <> 'unknown'),
      'unknown', (select count(*)::integer from decisions where recommendation = 'unknown'),
      'quality', case when (select count(*) from decisions where recommendation = 'unknown') > 0 then 'unknown' else 'complete' end),
    'sla', jsonb_build_object(
      'total', (select count(*)::integer from sla_segments),
      'known', (select count(*)::integer from sla_segments where state <> 'unknown'),
      'unknown', (select count(*)::integer from sla_segments where state = 'unknown'),
      'quality', case when (select count(*) from sla_segments where state = 'unknown') > 0 then 'unknown' else 'complete' end),
    'autonomy', jsonb_build_object(
      'total', (select count(*)::integer from event_observations where autonomy_value <> 'unknown'),
      'known', (select count(*)::integer from event_observations where autonomy_value <> 'unknown'),
      'unknown', (select count(*)::integer from event_observations where autonomy_value = 'unknown'),
      'quality', case when (select count(*) from event_observations where autonomy_value = 'unknown') > 0 then 'partial' else 'complete' end)),
  'population', jsonb_build_object(
    'applications', (select count(*)::integer from population),
    'byStatus', coalesce((select jsonb_agg(jsonb_build_object('status', status, 'count', count, 'share', coalesce(count::numeric / nullif((select count(*) from population), 0), 0)) order by status) from population_status), '[]'::jsonb),
    'byProduct', coalesce((select jsonb_agg(jsonb_build_object('productId', product_id, 'applications', applications, 'active', active, 'closed', closed, 'urgentOpen', urgent_open, 'overdue', overdue) order by product_id) from population_product), '[]'::jsonb),
    'byStage', coalesce((select jsonb_agg(jsonb_build_object('stage', stage, 'count', count, 'share', coalesce(count::numeric / nullif((select count(*) from population), 0), 0)) order by stage) from population_stage), '[]'::jsonb)),
  'activity', jsonb_build_object(
    'events', (select count(*)::integer from filtered),
    'applications', (select count(distinct application_id)::integer from filtered),
    'byActor', coalesce((select jsonb_agg(jsonb_build_object('actorKind', actor_kind, 'count', count) order by actor_kind) from activity_actor), '[]'::jsonb),
    'byStage', coalesce((select jsonb_agg(jsonb_build_object('stage', stage, 'count', count, 'share', coalesce(count::numeric / nullif((select count(*) from filtered), 0), 0)) order by stage) from activity_stage), '[]'::jsonb),
    'byStatus', coalesce((select jsonb_agg(jsonb_build_object('status', status, 'count', count, 'share', coalesce(count::numeric / nullif((select count(*) from filtered), 0), 0)) order by status) from activity_status), '[]'::jsonb)),
  'decisions', jsonb_build_object(
    'total', (select count(*)::integer from decisions),
    'approve', jsonb_build_object('count', (select count(*)::integer from decisions where decision = 'approve'), 'share', (select coalesce(count(*)::numeric / nullif((select count(*) from decisions), 0), 0) from decisions where decision = 'approve'), 'medianMinutes', (select percentile_cont(0.5) within group (order by decision_minutes) from decisions where decision = 'approve' and decision_minutes is not null), 'p90Minutes', (select percentile_cont(0.9) within group (order by decision_minutes) from decisions where decision = 'approve' and decision_minutes is not null)),
    'counterOffer', jsonb_build_object('count', (select count(*)::integer from decisions where decision = 'counter_offer'), 'share', (select coalesce(count(*)::numeric / nullif((select count(*) from decisions), 0), 0) from decisions where decision = 'counter_offer'), 'medianMinutes', (select percentile_cont(0.5) within group (order by decision_minutes) from decisions where decision = 'counter_offer' and decision_minutes is not null), 'p90Minutes', (select percentile_cont(0.9) within group (order by decision_minutes) from decisions where decision = 'counter_offer' and decision_minutes is not null)),
    'reject', jsonb_build_object('count', (select count(*)::integer from decisions where decision = 'reject'), 'share', (select coalesce(count(*)::numeric / nullif((select count(*) from decisions), 0), 0) from decisions where decision = 'reject'), 'medianMinutes', (select percentile_cont(0.5) within group (order by decision_minutes) from decisions where decision = 'reject' and decision_minutes is not null), 'p90Minutes', (select percentile_cont(0.9) within group (order by decision_minutes) from decisions where decision = 'reject' and decision_minutes is not null)),
    'requestInfo', (select count(*)::integer from decisions where decision = 'request_info'),
    'byProduct', coalesce((select jsonb_agg(jsonb_build_object('productId', product_id, 'decisions', decisions, 'approve', approve, 'counterOffer', counter_offer, 'reject', reject, 'requestInfo', request_info) order by product_id) from decision_product), '[]'::jsonb)),
  'recommendation', jsonb_build_object(
    'matched', (select count(*)::integer from decisions where recommendation <> 'unknown' and recommendation = decision),
    'overridden', (select count(*)::integer from decisions where recommendation <> 'unknown' and recommendation <> decision),
    'unknown', (select count(*)::integer from decisions where recommendation = 'unknown'),
    'overrideRate', (select count(*)::numeric / nullif(count(*) filter (where recommendation <> 'unknown'), 0) from decisions where recommendation <> 'unknown' and recommendation <> decision),
    'matrix', coalesce((select jsonb_agg(jsonb_build_object('recommendation', recommendation, 'decision', decision, 'count', count) order by recommendation, decision) from recommendation_matrix), '[]'::jsonb)),
  'sla', jsonb_build_object(
    'policyVersion', 'event-metadata-v1',
    'targets', jsonb_build_array(
      jsonb_build_object('stage', 'intake', 'targetMinutes', 240), jsonb_build_object('stage', 'completeness', 'targetMinutes', 480), jsonb_build_object('stage', 'enrichment', 'targetMinutes', 240), jsonb_build_object('stage', 'scoring', 'targetMinutes', 60), jsonb_build_object('stage', 'decision', 'targetMinutes', 240), jsonb_build_object('stage', 'signing', 'targetMinutes', 1440), jsonb_build_object('stage', 'disbursement', 'targetMinutes', 1440)),
    'byState', coalesce((select jsonb_agg(jsonb_build_object('state', state, 'count', count, 'share', coalesce(count::numeric / nullif((select count(*) from sla_segments), 0), 0)) order by state) from sla_state), '[]'::jsonb),
    'series', coalesce((select jsonb_agg(jsonb_build_object('bucketStart', bucket_start, 'eligible', eligible, 'met', met, 'overdue', overdue, 'paused', paused, 'unknown', unknown) order by bucket_start) from sla_series), '[]'::jsonb)),
  'autonomy', jsonb_build_object(
    'byMode', coalesce((select jsonb_agg(jsonb_build_object('mode', mode, 'count', count, 'share', coalesce(count::numeric / nullif((select count(*) from event_observations where autonomy_value <> 'unknown'), 0), 0)) order by mode) from autonomy_mode), '[]'::jsonb),
    'byDisposition', coalesce((select jsonb_agg(jsonb_build_object('disposition', disposition, 'count', count, 'share', coalesce(count::numeric / nullif((select count(*) from event_observations where normalized_autonomy_disposition is not null), 0), 0)) order by disposition) from autonomy_disposition), '[]'::jsonb),
    'series', coalesce((select jsonb_agg(jsonb_build_object('bucketStart', bucket_start, 'candidates', candidates, 'autoOffers', auto_offers, 'confirmed', confirmed, 'intercepted', intercepted, 'expired', expired, 'declined', declined, 'overrides', overrides) order by bucket_start) from autonomy_series), '[]'::jsonb)),
  'timeseries', coalesce((select jsonb_agg(jsonb_build_object('bucketStart', bucket, 'applications', applications, 'events', events, 'decisions', decisions, 'overdue', overdue) order by bucket) from timeseries), '[]'::jsonb)
) as summary;
`;
