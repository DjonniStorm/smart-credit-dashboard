-- Статус бизнес-процесса до отмены: кабинет показывает по нему этап,
-- на котором заявка была закрыта отменой.
alter table applications add column cancelled_from text;
