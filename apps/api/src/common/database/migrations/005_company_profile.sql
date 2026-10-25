-- Состояние проверок источников и первое согласие на БКИ.
create table if not exists company_source_checks (
  inn varchar(12) not null,
  source text not null,
  checked_at timestamptz not null,
  primary key (inn, source)
);

create table if not exists company_bki_consents (
  inn varchar(12) primary key,
  granted_at timestamptz not null
);
