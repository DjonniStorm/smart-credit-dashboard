-- Запрос клиента на срочный режим живёт отдельно от действующего режима: клиент только просит,
-- менеджер решает. Старые срочные заявки, включённые клиентом, становятся запросом в ожидании решения.
alter table applications add column if not exists urgent_request jsonb;
update applications set
  urgent_request = jsonb_build_object(
    'state', 'pending',
    'reason', coalesce(urgent_reason, ''),
    'requestedAt', urgent_source->>'at',
    'resolvedAt', null,
    'resolvedBy', null,
    'declineReason', null
  ),
  urgent = false,
  urgent_reason = null,
  urgent_source = null
where urgent and urgent_source->>'by' = 'client';
