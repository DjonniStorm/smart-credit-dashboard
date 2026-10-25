-- Команды клиента: ответ на запрос, сделка после принятия предложения, кто отменил заявку.
alter table applications add column if not exists client_reply jsonb;
alter table applications add column if not exists deal jsonb;
alter table applications add column if not exists cancelled_by text;
