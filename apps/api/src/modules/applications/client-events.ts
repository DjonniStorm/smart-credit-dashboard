import type { ApiAuditEvent, ApiClientEvent } from "@repo/contracts/api";
import { Locale, cabinetText } from "@repo/i18n";

const texts = cabinetText(Locale.Ru).applicationEvents;

/** Виды событий, которые попадают в кабинет клиента. */
const publicKinds = new Set([
  "application_created",
  "check_requested",
  "scoring_succeeded",
  "status_changed",
  "action",
]);

/** Действие видно клиенту, только если его совершил сам клиент. */
function isPublic(event: ApiAuditEvent): boolean {
  if (!publicKinds.has(event.kind)) {
    return false;
  }
  if (event.kind !== "action") {
    return true;
  }
  const payload = event.metadata as Record<string, unknown>;
  const report = (payload.reportContext ?? {}) as Record<string, unknown>;
  return (payload.actorKind ?? report.actorKind) === "client";
}

function textOf(kind: string, payload: Record<string, unknown>): string {
  const title = typeof payload.title === "string" ? payload.title : "";
  if (title) {
    return title;
  }
  const fallback: Record<string, string> = {
    application_created: texts.created,
    check_requested: texts.checkRequested,
    scoring_succeeded: texts.scoringCompleted,
    status_changed: texts.statusChanged,
    action: texts.clientAction,
  };
  return fallback[kind] ?? "Событие по заявке";
}

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
  return events.flatMap((event) => {
    if (!isPublic(event)) {
      return [];
    }
    const payload = event.metadata as Record<string, unknown>;
    return [
      {
        id: event.id,
        at: event.at,
        text: textOf(event.kind, payload),
        actor: actorOf(payload),
      },
    ];
  });
}
