import assert from "node:assert/strict";

import type { EmployeeAction } from "@repo/contracts/application";

import { toApiApplication } from "../src/modules/applications/api-mapper.ts";
import {
  act,
  actions,
  analyst,
  approve,
  db,
  lead,
  reload,
  store,
  test,
} from "./action-env.ts";
import { seedApplication } from "./action-fixtures.ts";

test("пауза и блокировка отклоняют любые действия кроме снятия", async () => {
  const application = await seedApplication(db);
  await act(application.id, { type: "pause", reason: "Ждём звонка" });
  assert.equal((await reload(application.id)).status, "in_review");
  assert.equal(
    toApiApplication(await reload(application.id)).status,
    "UNDER_REVIEW",
  );

  for (const action of [
    approve,
    { type: "reject", reason: "other", comment: "" },
    { type: "assign", assigneeId: lead.id },
    { type: "comment", visibility: "internal", body: "заметка" },
    { type: "pause", reason: "ещё раз" },
    { type: "cancel", reason: "нет" },
    { type: "rerun_check", source: "bki" },
  ] satisfies EmployeeAction[]) {
    await assert.rejects(act(application.id, action), { status: 409 });
  }

  await act(application.id, { type: "resume", comment: "" });
  await act(application.id, { type: "block", reason: "Проверка риска" });
  assert.equal(
    toApiApplication(await reload(application.id)).status,
    "BLOCKED",
  );
  await assert.rejects(act(application.id, approve), { status: 409 });
  await assert.rejects(
    act(application.id, { type: "resume", comment: "" }, analyst),
    { status: 403 },
  );
  await act(application.id, { type: "resume", comment: "Риск снят" }, lead);
  await act(application.id, approve);
  assert.equal((await reload(application.id)).status, "approved");
});

test("скоринг, пришедший на паузе, не ломает решение после снятия паузы", async () => {
  const application = await seedApplication(db, { scoring: null });
  await act(application.id, { type: "pause", reason: "Проверка идёт" });
  const hold = (await reload(application.id)).hold;
  assert.equal(hold?.previousWaitingOn, "system");

  await db.query("update applications set scoring=$2 where id=$1", [
    application.id,
    { score: 70, model: "baseline" },
  ]);
  await act(application.id, { type: "resume", comment: "" });
  await act(application.id, approve);
  assert.equal((await reload(application.id)).status, "approved");
});

test("повтор с тем же ключом не дублирует событие, комментарий и переход", async () => {
  const application = await seedApplication(db);
  const request = {
    action: {
      type: "comment",
      visibility: "client",
      body: "Звоним завтра",
    } satisfies EmployeeAction,
    idempotencyKey: "idem-key-1",
  };
  await actions.execute(application.id, request, analyst);
  await actions.execute(application.id, request, analyst);

  assert.equal((await store.listComments(application.id)).length, 1);
  assert.equal((await store.listEvents(application.id)).length, 1);

  const decision = { action: approve, idempotencyKey: "idem-key-2" };
  await actions.execute(application.id, decision, analyst);
  await actions.execute(application.id, decision, analyst);
  assert.equal((await store.listEvents(application.id)).length, 2);
});

test("параллельные команды с одним ключом выполняются один раз", async () => {
  const application = await seedApplication(db);
  const request = { action: approve, idempotencyKey: "idem-parallel" };
  const results = await Promise.allSettled([
    actions.execute(application.id, request, analyst),
    actions.execute(application.id, request, analyst),
    actions.execute(application.id, request, analyst),
  ]);
  assert.ok(results.every((result) => result.status === "fulfilled"));
  assert.equal((await store.listEvents(application.id)).length, 1);
});

test("комментарии клиенту и внутренние хранятся раздельно", async () => {
  const application = await seedApplication(db);
  await act(application.id, {
    type: "comment",
    visibility: "client",
    body: "Для клиента",
  });
  await act(application.id, {
    type: "comment",
    visibility: "internal",
    body: "Только банк",
  });

  const clientVisible = await store.listComments(application.id, "client");
  assert.deepEqual(
    clientVisible.map((comment) => comment.body),
    ["Для клиента"],
  );
  assert.equal((await store.listComments(application.id)).length, 2);
  const publicView = toApiApplication(
    await reload(application.id),
    clientVisible,
  );
  assert.deepEqual(
    publicView.clientComments.map((comment) => comment.body),
    ["Для клиента"],
  );
});

test("назначение, передача, срочность и повторная проверка", async () => {
  const application = await seedApplication(db);
  await act(application.id, { type: "assign", assigneeId: analyst.id });
  assert.equal((await reload(application.id)).assigneeId, analyst.id);

  await act(application.id, {
    type: "handoff",
    assigneeId: lead.id,
    summary: "Нужна проверка залога",
    verifiedFacts: ["ЕГРЮЛ"],
    openQuestions: [],
    requestedItems: [],
    nextStep: "Запросить оценку",
  });
  const handed = await reload(application.id);
  assert.equal(handed.assigneeId, lead.id);
  assert.equal(handed.handoff?.nextStep, "Запросить оценку");
  assert.equal((await store.listComments(application.id, "handoff")).length, 1);

  await act(application.id, {
    type: "set_urgent",
    enabled: true,
    reason: "VIP",
  });
  assert.equal((await reload(application.id)).urgent, true);

  const previousJob = handed.checkJobId;
  await act(application.id, { type: "rerun_check", source: "bki" });
  const rechecked = await reload(application.id);
  assert.equal(rechecked.scoring, null);
  assert.notEqual(rechecked.checkJobId, previousJob);
  const jobs = await db.query("select status from scoring_jobs where id=$1", [
    rechecked.checkJobId,
  ]);
  assert.equal(jobs[0]?.status, "queued");
  await assert.rejects(act(application.id, approve), { status: 409 });
});

test("неизвестная заявка даёт 404", async () => {
  await assert.rejects(act("app-missing", approve), { status: 404 });
});
