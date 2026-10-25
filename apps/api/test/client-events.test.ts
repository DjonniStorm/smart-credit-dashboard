import assert from "node:assert/strict";
import test from "node:test";

import type { ApiAuditEvent } from "@repo/contracts/api";

import { toApiClientEvents } from "../src/modules/applications/client-events.ts";

function event(
  kind: string,
  payload: Record<string, unknown> = {},
): ApiAuditEvent {
  return {
    id: `ev-${kind}`,
    applicationId: "app-test",
    kind,
    at: "2026-10-24T12:00:00.000Z",
    metadata: payload,
  };
}

test("публичные события: создание, проверка, скоринг, статус и действия клиента", () => {
  const events = [
    event("application_created"),
    event("check_requested"),
    event("scoring_succeeded"),
    event("status_changed", { title: "Заявка одобрена" }),
    event("action", { actorKind: "client" }),
  ];
  const result = toApiClientEvents(events);
  assert.deepEqual(
    result.map((item) => item.id),
    [
      "ev-application_created",
      "ev-check_requested",
      "ev-scoring_succeeded",
      "ev-status_changed",
      "ev-action",
    ],
  );
  assert.equal(result[3]?.text, "Заявка одобрена");
  assert.equal(result[4]?.actor, "client");
});

test("внутренние события не попадают в кабинет", () => {
  const events = [
    event("hold"),
    event("handoff"),
    event("comment_added"),
    event("autonomy_candidate"),
    event("autonomy_auto_offer"),
    event("autonomy_expired"),
    event("autonomy_override"),
    event("autonomy_intercepted"),
    event("scoring_failed"),
  ];
  assert.deepEqual(toApiClientEvents(events), []);
});

test("действия сотрудника скрыты, тексты берутся из словаря i18n", () => {
  const events = [
    event("action", { actorKind: "employee", title: "Назначен ответственный" }),
    event("application_created"),
    event("scoring_succeeded"),
    event("status_changed"),
  ];
  const result = toApiClientEvents(events);
  assert.deepEqual(
    result.map((item) => item.text),
    ["Заявка создана", "Проверка данных завершена", "Статус заявки изменён"],
  );
});
