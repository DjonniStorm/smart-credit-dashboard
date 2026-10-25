import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { act, analyst, db, lead, reload, test } from "./action-env.ts";
import { seedApplication } from "./action-fixtures.ts";

const withRecommendation = (
  recommendation: "approve" | "counter_offer" | "reject" | "request_info",
) => ({
  decision: {
    recommendation,
    reasons: [],
    rules: [],
    autonomyMode: "assist" as const,
  },
});

test("решение против рекомендации требует комментарий, по рекомендации нет", async () => {
  const application = await seedApplication(
    db,
    withRecommendation("counter_offer"),
  );
  await assert.rejects(act(application.id, { type: "approve", comment: " " }), {
    status: 422,
  });
  await assert.rejects(
    act(application.id, { type: "reject", reason: "other", comment: "" }),
    { status: 422 },
  );
  assert.equal((await reload(application.id)).status, "in_review");

  await act(application.id, { type: "approve", comment: "Клиент надёжный" });
  assert.equal((await reload(application.id)).status, "approved");

  const matching = await seedApplication(db, withRecommendation("approve"));
  await act(matching.id, { type: "approve", comment: "" });
  assert.equal((await reload(matching.id)).status, "approved");

  const rejected = await seedApplication(db, withRecommendation("reject"));
  await act(rejected.id, { type: "reject", reason: "low_score", comment: "" });
  assert.equal((await reload(rejected.id)).status, "rejected");
});

test("запрос документов не требует комментария даже против рекомендации", async () => {
  const application = await seedApplication(db, withRecommendation("approve"));
  await act(application.id, {
    type: "request_info",
    items: ["Выписка"],
    comment: "",
  });
  assert.equal((await reload(application.id)).status, "needs_client");
});

test("снять блокировку может только руководитель, автор берётся из сессии", async () => {
  const application = await seedApplication(db);
  await act(application.id, { type: "block", reason: "Проверка" }, analyst);
  assert.equal((await reload(application.id)).hold?.by.name, analyst.name);
  await assert.rejects(
    act(application.id, { type: "resume", comment: "" }, analyst),
    { status: 403 },
  );
  await act(application.id, { type: "resume", comment: "" }, lead);
  assert.equal((await reload(application.id)).hold, null);
});

test("миграция переносит action_state из 003 в колонки", async () => {
  const blocked = await seedApplication(db, { status: "approved" });
  const countered = await seedApplication(db, { status: "approved" });
  await db.query(
    `update applications set status='blocked', action_state=$2 where id=$1`,
    [
      blocked.id,
      {
        assigneeId: "an-1",
        urgent: true,
        urgentReason: "VIP",
        hold: {
          state: "blocked",
          previousStatus: "approved",
          reason: "Риск",
          at: "2026-10-23T10:00:00.000Z",
          by: { kind: "employee", name: "an-1" },
          previousWaitingOn: "client",
          previousBlocker: "",
        },
        comments: [
          {
            id: "legacy-comment-1",
            applicationId: blocked.id,
            at: "2026-10-23T10:00:00.000Z",
            author: { kind: "employee", name: "Сотрудник" },
            visibility: "internal",
            body: "Старая заметка",
          },
        ],
      },
    ],
  );
  await db.query(`update applications set action_state=$2 where id=$1`, [
    countered.id,
    {
      offerKind: "counter",
      offer: {
        productId: "working_capital",
        amount: 900_000,
        termMonths: 12,
        ratePct: 20,
      },
    },
  ]);

  const sql = await readFile(
    new URL(
      "../src/common/database/migrations/004_employee_actions.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.query(sql.slice(sql.indexOf("update applications set")));

  const migratedBlocked = await reload(blocked.id);
  assert.equal(migratedBlocked.status, "approved");
  assert.equal(migratedBlocked.hold?.state, "blocked");
  assert.equal("previousStatus" in (migratedBlocked.hold ?? {}), false);
  assert.equal(migratedBlocked.assigneeId, "an-1");
  assert.equal(migratedBlocked.urgent, true);
  const comments = await db.query(
    "select body from application_comments where application_id=$1",
    [blocked.id],
  );
  assert.deepEqual(
    comments.map((row: { body: string }) => row.body),
    ["Старая заметка"],
  );

  const migratedCounter = await reload(countered.id);
  assert.equal(migratedCounter.status, "counter_offer");
  assert.equal(migratedCounter.offer?.amount, 900_000);
});

test("документы можно запросить до окончания скоринга", async () => {
  const application = await seedApplication(db, { scoring: null });
  await act(application.id, {
    type: "request_info",
    items: ["Выписка"],
    comment: "",
  });
  assert.equal((await reload(application.id)).status, "needs_client");
});
