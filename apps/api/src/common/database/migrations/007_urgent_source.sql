-- Срочный режим: кто его включил (клиент или сотрудник) и когда. Флаг urgent не меняется.
-- Старые срочные заявки были включены сотрудником, поэтому им проставляем employee.
alter table applications add column if not exists urgent_source jsonb;
update applications set urgent_source = jsonb_build_object('by', 'employee', 'at', updated_at)
where urgent and urgent_source is null;
