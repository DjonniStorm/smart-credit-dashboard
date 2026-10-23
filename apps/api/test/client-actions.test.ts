import assert from "node:assert/strict";

import type { DemoSession } from "@repo/contracts/api";
import type { ClientAction } from "@repo/contracts/client-actions";

import { toApiApplication } from "../src/modules/applications/api-mapper.ts";
import { ClientActionsService } from "../src/modules/applications/client-actions.service.ts";
import { demoSignCode } from "../src/modules/applications/client-commands.ts";
import { act, approve, db, reload, store, test } from "./action-env.ts";
import { seedApplication } from "./action-fixtures.ts";

const owner = {
  account: { person: "Анна Клиентова", company: { inn: "7701234567" } },
  role: "client",
} as DemoSession;
const stranger = {
  account: { person: "Чужой", company: { inn: "7709999999" } },
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
  session = owner,
  idempotencyKey = `client-key-${Date.now()}-${(counter += 1)}`,
) {
  return service().execute(id, { action, idempotencyKey }, session);
}

async function eventCount(id: string): Promise<number> {
  const rows = await db.query(
    "select count(*)::int as n from application_events where application_id=$1",
    [id],
  );
  return rows[0].n;
}

/** Одобрение, принятие клиентом и системная подготовка договора. */
async function toSigning(id: string) {
  await act(id, approve);
  await clientAct(id, { type: "accept_offer" });
  await service().prepareContracts();
}

test("ответ на запрос возвращает заявку на рассмотрение и сохраняет ответ", async () => {
  const application = await seedApplication(db);
  await act(application.id, {
    type: "request_info",
    items: ["Выписка за 6 месяцев"],
    comment: "",
  });
  const answer = { text: "Прикладываю выписку", documents: [] };
  const response = await clientAct(application.id, {
    type: "answer_request",
    answer,
  });
  assert.equal(response.application.status, "UNDER_REVIEW");
  assert.equal(response.application.clientReply?.text, answer.text);
  assert.equal((await reload(application.id)).status, "in_review");
});

test("принятие ведёт в ACCEPTED, система готовит договор, подпись доводит до выдачи", async () => {
  const application = await seedApplication(db);
  await act(application.id, approve);

  const accepted = await clientAct(application.id, { type: "accept_offer" });
  assert.equal(accepted.application.status, "ACCEPTED");
  assert.equal(accepted.application.deal?.offerKind, "initial");
  await assert.rejects(
    clientAct(application.id, { type: "request_sign_code" }),
    { status: 409 },
  );

  assert.ok((await service().prepareContracts()) >= 1);
  assert.equal((await reload(application.id)).status, "signing");

  const { demoCode } = await clientAct(application.id, {
    type: "request_sign_code",
  });
  assert.equal(demoCode, demoSignCode(application.id));
  const wrong = demoCode === "000000" ? "111111" : "000000";
  await assert.rejects(
    clientAct(application.id, { type: "sign", code: wrong }),
    { status: 422 },
  );

  const signed = await clientAct(application.id, {
    type: "sign",
    code: demoCode!,
  });
  assert.equal(signed.application.status, "FUNDED");
  assert.ok(signed.application.deal?.signedAt);
  assert.ok(signed.application.deal?.disbursedAt);
});

test("подпись без запроса кода даёт 409", async () => {
  const application = await seedApplication(db);
  await toSigning(application.id);
  await assert.rejects(
    clientAct(application.id, {
      type: "sign",
      code: demoSignCode(application.id),
    }),
    { status: 409 },
  );
  assert.equal((await reload(application.id)).status, "signing");
});

test("отказ закрывает заявку с пометкой, что отказался клиент", async () => {
  const application = await seedApplication(db);
  await act(application.id, {
    type: "counter_offer",
    terms: { productId: "working_capital", amount: 1_000_000, termMonths: 12 },
    comment: "Меньше сумма",
  });
  const response = await clientAct(application.id, { type: "decline_offer" });
  assert.equal(response.application.status, "CANCELLED");
  assert.equal(response.application.cancelledBy, "client");
  assert.ok(response.application.offer);
  assert.equal(response.application.deal, null);
});

test("отмена сотрудником после принятия закрывает сделку", async () => {
  const application = await seedApplication(db);
  await toSigning(application.id);
  await act(application.id, { type: "cancel", reason: "Клиент передумал" });

  const cancelled = toApiApplication(await reload(application.id));
  assert.equal(cancelled.status, "CANCELLED");
  assert.equal(cancelled.cancelledBy, "employee");
  assert.equal(cancelled.deal, null);
  await assert.rejects(
    clientAct(application.id, { type: "request_sign_code" }),
    { status: 409 },
  );
});

test("на паузе действия клиента и подготовка договора стоят", async () => {
  const application = await seedApplication(db);
  await act(application.id, approve);
  await clientAct(application.id, { type: "accept_offer" });
  await act(application.id, { type: "pause", reason: "Проверяем залог" });

  await service().prepareContracts();
  assert.equal((await reload(application.id)).status, "accepted");
  await assert.rejects(
    clientAct(application.id, { type: "request_sign_code" }),
    { status: 409 },
  );
});

test("запрещённые переходы дают 409", async () => {
  const application = await seedApplication(db);
  for (const action of [
    { type: "accept_offer" },
    { type: "decline_offer" },
    { type: "request_sign_code" },
    { type: "sign", code: "123456" },
    { type: "answer_request", answer: { text: "ответ", documents: [] } },
  ] satisfies ClientAction[]) {
    await assert.rejects(clientAct(application.id, action), { status: 409 });
  }

  await act(application.id, approve);
  await clientAct(application.id, { type: "decline_offer" });
  await assert.rejects(clientAct(application.id, { type: "accept_offer" }), {
    status: 409,
  });
});

test("чужая и несуществующая заявки дают 404", async () => {
  const application = await seedApplication(db);
  await act(application.id, approve);
  await assert.rejects(
    clientAct(application.id, { type: "accept_offer" }, stranger),
    { status: 404 },
  );
  await assert.rejects(clientAct("app-missing", { type: "accept_offer" }), {
    status: 404,
  });
  assert.equal((await reload(application.id)).status, "approved");
});

test("повтор с тем же ключом не дублирует событие и переход", async () => {
  const application = await seedApplication(db);
  await act(application.id, approve);
  const before = await eventCount(application.id);

  await clientAct(
    application.id,
    { type: "accept_offer" },
    owner,
    "same-key-1",
  );
  const repeated = await clientAct(
    application.id,
    { type: "accept_offer" },
    owner,
    "same-key-1",
  );
  assert.equal(repeated.application.status, "ACCEPTED");
  assert.equal(await eventCount(application.id), before + 1);
});

test("тот же ключ для другого действия не считается повтором", async () => {
  const application = await seedApplication(db);
  await act(application.id, approve);
  await clientAct(
    application.id,
    { type: "accept_offer" },
    owner,
    "shared-key",
  );
  await assert.rejects(
    clientAct(application.id, { type: "decline_offer" }, owner, "shared-key"),
    { status: 409 },
  );
});
