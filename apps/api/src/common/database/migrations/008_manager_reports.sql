create index if not exists application_events_report_cursor_idx
  on application_events (created_at desc, id desc);

create index if not exists application_events_report_application_idx
  on application_events (application_id, created_at, id);

create index if not exists application_events_report_kind_idx
  on application_events (kind, created_at, id);

create index if not exists application_comments_report_cursor_idx
  on application_comments (created_at desc, id desc);
