import assert from "node:assert/strict";

import { toApiApplication } from "../src/modules/applications/api-mapper.ts";
import {
  act,
  analyst,
  approve,
  db,
  lead,
  reload,
  store,
  test,
} from "./action-env.ts";
import { seedApplication } from "./action-fixtures.ts";

test("разрешённые решения переводят заявку и пишут автора в журнал", async () => {
  const approved = await seedApplication(db);
  await act(approved.id, approve);
  const afterApprove = await reload(approved.id);
  assert.equal(afterApprove.status, "approved");
  assert.equal(afterApprove.offer?.amount, approved.amount);
  const [event] = (await store.listEvents(approved.id)).slice(-1);
  assert.equal(event?.metadata.actorName, analyst.name);
  assert.equal(event?.metadata.fromStatus, "in_review");
  assert.equal(event?.metadata.toStatus, "approved");
  assert.equal(event?.metadata.comment, "Всё в порядке");

  const countered = await seedApplication(db);
  await act(countered.id, {
    type: "counter_offer",
    terms: {
      productId: "working_capital",
      amount: 1_000_000,
      termMonths: 12,
      ratePct: 0,
    },
    comment: "Меньше сумма",
  });
  const afterCounter = await reload(countered.id);
  assert.equal(afterCounter.status, "counter_offer");
  assert.equal(afterCounter.offer?.amount, 1_000_000);
  assert.notEqual(afterCounter.offer?.ratePct, 0, "ставку считает сервер");
  assert.equal(toApiApplication(afterCounter).offerKind, "counter");

  const asked = await seedApplication(db);
  await act(asked.id, {
    type: "request_info",
    items: ["Выписка"],
    comment: "",
  });
  const afterAsk = await reload(asked.id);
  assert.equal(afterAsk.status, "needs_client");
  assert.deepEqual(afterAsk.requestedInfo, ["Выписка"]);

  const rejected = await seedApplication(db);
  await act(rejected.id, {
    type: "reject",
    reason: "low_score",
    comment: "Низкий балл",
  });
  const afterReject = await reload(rejected.id);
  assert.equal(afterReject.status, "rejected");
  assert.equal(afterReject.rejectReason, "low_score");
});

test("отмена доступна на любом нефинальном статусе и закрывает заявку", async () => {
  for (const status of ["in_review", "needs_client", "approved"] as const) {
    const application = await seedApplication(db, { status });
    await act(application.id, { type: "cancel", reason: "Клиент передумал" });
    assert.equal((await reload(application.id)).status, "cancelled");
  }
});

test("запрещённые переходы дают 409", async () => {
  const waitingClient = await seedApplication(db, {
    status: "needs_client",
  });
  await assert.rejects(act(waitingClient.id, approve), { status: 409 });

  const noScoring = await seedApplication(db, { scoring: null });
  await assert.rejects(act(noScoring.id, approve), { status: 409 });

  const closed = await seedApplication(db, { status: "rejected" });
  await assert.rejects(
    act(closed.id, { type: "comment", visibility: "internal", body: "поздно" }),
    { status: 409 },
  );
  await assert.rejects(act(closed.id, { type: "pause", reason: "поздно" }), {
    status: 409,
  });

  const decided = await seedApplication(db);
  await act(decided.id, approve);
  await assert.rejects(
    act(decided.id, { type: "reject", reason: "other", comment: "" }),
    { status: 409 },
  );

  const active = await seedApplication(db);
  await assert.rejects(act(active.id, { type: "resume", comment: "" }), {
    status: 409,
  });
  assert.equal(
    (await reload(active.id)).status,
    "in_review",
    "отказ не меняет заявку",
  );
});

test("лимиты: сумма выше лимита, условия вне продукта, чужой сотрудник", async () => {
  const large = await seedApplication(db, { amount: 9_000_000 });
  await assert.rejects(act(large.id, approve), { status: 403 });
  await act(large.id, approve, lead);
  assert.equal((await reload(large.id)).status, "approved");

  const application = await seedApplication(db);
  await assert.rejects(
    act(application.id, {
      type: "counter_offer",
      terms: {
        productId: "cash_gap",
        amount: 50_000_000,
        termMonths: 6,
        ratePct: 1,
      },
      comment: "Условия",
    }),
    { status: 403 },
  );
  await assert.rejects(
    act(application.id, {
      type: "counter_offer",
      terms: {
        productId: "cash_gap",
        amount: 4_000_000,
        termMonths: 6,
        ratePct: 1,
      },
      comment: "Условия",
    }),
    { status: 422 },
  );
  await assert.rejects(
    act(application.id, { type: "assign", assigneeId: "nobody" }),
    { status: 422 },
  );
});
