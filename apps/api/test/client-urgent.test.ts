import assert from "node:assert/strict";

import type { DemoSession } from "@repo/contracts/api";
import type { ClientAction } from "@repo/contracts/client-actions";
import { clientActionRequestSchema } from "@repo/contracts/client-actions";

import { toApiApplication } from "../src/modules/applications/api-mapper.ts";
import { ClientActionsService } from "../src/modules/applications/client-actions.service.ts";
import { act, db, reload, store, test } from "./action-env.ts";
import { seedApplication } from "./action-fixtures.ts";

const owner = {
  account: { person: "Анна Клиентова", company: { inn: "7701234567" } },
  role: "client",
} as DemoSession;

function service() {
  return new ClientActionsService(store, {
    getApiApplication: async (applicationId: string) =>
      toApiApplication(await reload(applicationId)),
  } as never);
}

let counter = 0;
function clientAct(
  id: string,
  action: ClientAction,
  idempotencyKey = `urgent-key-${Date.now()}-${(counter += 1)}`,
) {
  return service().execute(id, { action, idempotencyKey }, owner);
}

const request: ClientAction = {
  type: "set_urgent",
  enabled: true,
  reason: "Платёж по аренде через неделю",
};
const withdraw: ClientAction = {
  type: "set_urgent",
  enabled: false,
  reason: "",
};

/** Записи аудита о запросе срочности, самые новые первыми. */
async function urgentEvents(id: string) {
  const rows = await db.query(
    `select payload from application_events
     where application_id=$1 and payload->>'actionType' in ('set_urgent','decline_urgent')
     order by id desc`,
    [id],
  );
  return rows.map((row: { payload: Record<string, string> }) => row.payload);
}

test("клиент запрашивает срочность: запрос ждёт решения, режим не включается", async () => {
  const application = await seedApplication(db);
  const before = await reload(application.id);

  const response = await clientAct(application.id, request);
  const after = await reload(application.id);

  assert.equal(after.urgent, false);
  assert.equal(after.urgentReason, null);
  assert.equal(after.urgentSource, null);
  assert.equal(after.urgentRequest?.state, "pending");
  assert.equal(after.urgentRequest?.reason, request.reason);
  assert.equal(after.status, before.status);
  assert.equal(response.application.urgentRequest?.state, "pending");
  assert.equal(response.application.urgentBy, null);

  const [event] = await urgentEvents(application.id);
  assert.equal(event.urgentRequest, "pending");
});

test("сотрудник включает режим по запросу: запрос принят, автор и время сохранены", async () => {
  const application = await seedApplication(db);
  await clientAct(application.id, request);

  await act(application.id, {
    type: "set_urgent",
    enabled: true,
    reason: request.reason,
  });
  const after = await reload(application.id);

  assert.equal(after.urgent, true);
  assert.equal(after.urgentSource?.by, "employee");
  assert.equal(after.urgentRequest?.state, "accepted");
  assert.equal(after.urgentRequest?.resolvedBy?.kind, "employee");
  assert.ok(after.urgentRequest?.resolvedAt);

  const cabinet = toApiApplication(after);
  assert.equal(cabinet.urgentBy, "employee");
  assert.equal(cabinet.urgentRequest?.state, "accepted");
  assert.equal("resolvedBy" in (cabinet.urgentRequest ?? {}), false);
});

test("сотрудник отклоняет запрос: режим не меняется, причина и автор в запросе", async () => {
  const application = await seedApplication(db);
  await clientAct(application.id, request);

  await act(application.id, {
    type: "decline_urgent",
    reason: "Срочность не подтверждена",
  });
  const after = await reload(application.id);

  assert.equal(after.urgent, false);
  assert.equal(after.urgentRequest?.state, "declined");
  assert.equal(after.urgentRequest?.declineReason, "Срочность не подтверждена");
  assert.equal(after.urgentRequest?.resolvedBy?.kind, "employee");
  const cabinet = toApiApplication(after);
  assert.equal(
    cabinet.urgentRequest?.declineReason,
    "Срочность не подтверждена",
  );
});

test("после отказа и после принятия клиент не может запросить снова: 409", async () => {
  const declined = await seedApplication(db);
  await clientAct(declined.id, request);
  await act(declined.id, { type: "decline_urgent", reason: "Нет оснований" });
  await assert.rejects(clientAct(declined.id, request), { status: 409 });

  const accepted = await seedApplication(db);
  await clientAct(accepted.id, request);
  await act(accepted.id, { type: "set_urgent", enabled: true, reason: "Ок" });
  await assert.rejects(clientAct(accepted.id, request), { status: 409 });
});

test("сотрудник снял режим: клиент всё равно не может включить его снова", async () => {
  const application = await seedApplication(db);
  await clientAct(application.id, request);
  await act(application.id, {
    type: "set_urgent",
    enabled: true,
    reason: "Ок",
  });
  await act(application.id, { type: "set_urgent", enabled: false, reason: "" });

  const after = await reload(application.id);
  assert.equal(after.urgent, false);
  assert.equal(after.urgentRequest?.state, "accepted");
  await assert.rejects(clientAct(application.id, request), { status: 409 });
});

test("клиент отзывает свой запрос в ожидании; повторный отзыв даёт 409", async () => {
  const application = await seedApplication(db);
  await clientAct(application.id, request);

  const response = await clientAct(application.id, withdraw);
  assert.equal(response.application.urgentRequest, null);
  assert.equal((await reload(application.id)).urgentRequest, null);
  await assert.rejects(clientAct(application.id, withdraw), { status: 409 });
});

test("отзыв без запроса даёт 409, запрос без причины 422, повтор запроса 409", async () => {
  const application = await seedApplication(db);
  await assert.rejects(clientAct(application.id, withdraw), { status: 409 });
  await assert.rejects(
    clientAct(application.id, {
      type: "set_urgent",
      enabled: true,
      reason: "  ",
    }),
    { status: 422 },
  );
  assert.equal((await reload(application.id)).urgentRequest, null);

  await clientAct(application.id, request);
  await assert.rejects(clientAct(application.id, request), { status: 409 });
});

test("отказ без причины даёт 422, отказ вне ожидания даёт 409", async () => {
  const application = await seedApplication(db);
  await assert.rejects(
    act(application.id, { type: "decline_urgent", reason: "  " }),
    { status: 422 },
  );
  await assert.rejects(
    act(application.id, { type: "decline_urgent", reason: "Нет запроса" }),
    { status: 409 },
  );
});

test("на паузе запрос срочности недоступен: 409", async () => {
  const application = await seedApplication(db);
  await act(application.id, { type: "pause", reason: "Проверяем залог" });
  await assert.rejects(clientAct(application.id, request), { status: 409 });
  assert.equal((await reload(application.id)).urgentRequest, null);
});

test("закрытая заявка не принимает запрос срочности: 409", async () => {
  const application = await seedApplication(db);
  await act(application.id, { type: "cancel", reason: "Клиент передумал" });
  await assert.rejects(clientAct(application.id, request), { status: 409 });
  assert.equal((await reload(application.id)).urgentRequest, null);
});

test("повтор запроса с тем же ключом не создаёт второе событие", async () => {
  const application = await seedApplication(db);
  await clientAct(application.id, request, "urgent-same-key");
  const count = (await urgentEvents(application.id)).length;

  await clientAct(application.id, request, "urgent-same-key");

  assert.equal((await urgentEvents(application.id)).length, count);
});

test("тело команды с set_urgent проходит схему, причина по умолчанию пустая", () => {
  const parsed = clientActionRequestSchema.parse({
    action: { type: "set_urgent", enabled: false },
    idempotencyKey: "urgent-key-12345",
  });
  assert.deepEqual(parsed.action, {
    type: "set_urgent",
    enabled: false,
    reason: "",
  });
});
