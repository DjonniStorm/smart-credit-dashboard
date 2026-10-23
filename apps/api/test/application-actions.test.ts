import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import baseTest, { after, before } from "node:test";

import { DataSource } from "typeorm";

import type { EmployeeAction } from "@repo/contracts/application";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

import { runMigrations } from "../src/common/database/migration-runner.ts";
import { DemoDataStore } from "../src/common/demo-data/demo-data.store.ts";
import { demoEmployees } from "../src/common/demo-data/demo-data.ts";
import { toApiApplication } from "../src/modules/applications/api-mapper.ts";
import { ApplicationActionsService } from "../src/modules/applications/application-actions.service.ts";
import { WorkflowStore } from "../src/modules/applications/workflow-store.ts";
import { catalog, seedApplication } from "./action-fixtures.ts";

// Тесты идут против настоящего Postgres: блокировка строки и идемпотентность
// держатся на SQL, на памяти их не проверить. Каждый прогон живёт в своей схеме.
// Локально: `pnpm db:up` и TEST_DATABASE_URL=postgres://alfa:alfa@localhost:5432/alfa.
const databaseUrl = process.env.TEST_DATABASE_URL;
const schema = `t_${randomUUID().replaceAll("-", "")}`;

const analyst = demoEmployees[0]!;
const lead = demoEmployees.find((employee) => employee.role === "lead")!;

let db: DataSource;
let store: WorkflowStore;
let actions: ApplicationActionsService;

if (databaseUrl) {
  before(async () => {
    const admin = await new DataSource({
      type: "postgres",
      url: databaseUrl,
    }).initialize();
    await admin.query(`create schema ${schema}`);
    await admin.destroy();
    db = await new DataSource({
      type: "postgres",
      url: databaseUrl,
      extra: { options: `-c search_path=${schema}` },
    }).initialize();
    await runMigrations(db);
    const data = new DemoDataStore(db);
    await data.seed();
    store = new WorkflowStore(db);
    actions = new ApplicationActionsService(
      store,
      { getCatalog: () => catalog } as never,
      data,
      { getApiApplicationContext: async () => ({}) } as never,
    );
  });

  after(async () => {
    await db.query(`drop schema ${schema} cascade`);
    await db.destroy();
  });
}

const test = databaseUrl
  ? baseTest
  : (name: string) => baseTest.skip(`${name} (TEST_DATABASE_URL не задан)`);

let counter = 0;
function act(
  id: string,
  action: EmployeeAction,
  employee = analyst,
  idempotencyKey = `key-${Date.now()}-${(counter += 1)}`,
) {
  return actions.execute(id, { action, idempotencyKey }, employee);
}

async function reload(id: string): Promise<ApplicationWorkflow> {
  const application = await store.getApplication(id);
  assert.ok(application);
  return application;
}

const approve: EmployeeAction = { type: "approve", comment: "Всё в порядке" };

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
      comment: "",
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
      comment: "",
    }),
    { status: 422 },
  );
  await assert.rejects(
    act(application.id, { type: "assign", assigneeId: "nobody" }),
    { status: 422 },
  );
});

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
