import type { ApiAuditEvent, ApiClientEvent } from "@repo/contracts/api";

/** Тексты для событий без человеческого названия в payload сервис пишет title в payload. */
const fallbackText: Record<string, string> = {
  application_created: "Заявка создана",
  check_requested: "Проверка данных запущена",
  scoring_succeeded: "Проверка данных завершена",
  scoring_failed: "Проверка данных не прошла",
  status_changed: "Статус заявки изменён",
  action: "Действие по заявке",
  comment_added: "Добавлен комментарий",
  handoff: "Заявка передана сотруднику",
  hold: "Рассмотрение приостановлено",
  autonomy_candidate: "Подготовлена автономная рекомендация",
  autonomy_auto_offer: "Сформировано автоматическое предложение",
  autonomy_expired: "Контрольное окно автоодобрения закрыто",
  autonomy_override: "Решение принято вручную поверх допуска",
};

/** Автор события для кабинета: сотрудник показывается как банк. */
function actorOf(payload: Record<string, unknown>): ApiClientEvent["actor"] {
  const report = (payload.reportContext ?? {}) as Record<string, unknown>;
  const kind = payload.actorKind ?? report.actorKind;
  if (kind === "client") {
    return "client";
  }
  if (kind === "employee") {
    return "bank";
  }
  return "system";
}

/** Сырые события аудита превращаются в безопасные записи для кабинета клиента. */
export function toApiClientEvents(events: ApiAuditEvent[]): ApiClientEvent[] {
  return events.map((event) => {
    const payload = event.metadata as Record<string, unknown>;
    const title = typeof payload.title === "string" ? payload.title : "";
    return {
      id: event.id,
      at: event.at,
      text: title || fallbackText[event.kind] || "Событие по заявке",
      actor: actorOf(payload),
    };
  });
}
