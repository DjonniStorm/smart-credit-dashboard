-- Номера заявок выдаёт база, а не счётчик в памяти API.
create sequence if not exists application_number_seq;
select setval(
  'application_number_seq',
  greatest(1000, coalesce((select max(substr(number, 4)::bigint) from applications where number ~ '^SC-[0-9]+$'), 0))
);

create index if not exists scoring_jobs_application_idx on scoring_jobs(application_id);
create index if not exists application_events_application_idx on application_events(application_id);
create index if not exists source_checks_job_idx on source_checks(job_id);
