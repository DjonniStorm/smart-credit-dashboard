import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import type { DataSource } from "typeorm";

import {
  cleanResult,
  logisticsResult,
  logisticsSession,
  makeClientActions,
  makeService,
  makeStore,
  makeWorker,
  provisionDatabase,
  teardownDatabase,
} from "./applications-auto-request-helpers.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseRequired = Boolean(process.env.CI);

test("в CI задан TEST_DATABASE_URL", { skip: !databaseRequired }, () => {
  assert.ok(
    databaseUrl,
    "TEST_DATABASE_URL не задан: тесты на Postgres не должны молча пропускаться в CI",
  );
});

const input = (idempotencyKey: string, inn: string) =>
  ({
    inn,
    productId: "working_capital",
    amount: 500_000,
    termMonths: 12,
    purpose: "working_capital",
    idempotencyKey,
  }) as const;

describe(
  "автоматический запрос по расхождению источников",
  {
    skip:
      databaseUrl || databaseRequired ? false : "TEST_DATABASE_URL не задан",
  },
  () => {
    let db: DataSource;
    let schema: string;
    let companyCheck: () => Promise<typeof cleanResult>;

    if (databaseUrl) {
      before(async () => {
        ({ db, schema } = await provisionDatabase(databaseUrl));
      });
      after(async () => {
        await teardownDatabase(db, schema);
      });
    }

    test("без расхождений автоматический запрос не создаётся", async () => {
      companyCheck = async () => cleanResult;
      const store = makeStore(db);
      const service = makeService(db, () => companyCheck());
      const created = await service.create(input("clean-key-1", "7701234567"));
      await makeWorker(store, service).drain();
      const application = await service.getApplication(created.application.id);
      assert.notEqual(application.status, "needs_client");
      assert.deepEqual(application.requestedInfo, []);
      assert.equal(application.scoring?.score, 82);
    });

    test("расхождение источников переводит заявку в NEEDS_INFO с запросом клиенту", async () => {
      companyCheck = async () => logisticsResult;
      const store = makeStore(db);
      const service = makeService(db, () => companyCheck());
      const clientActions = makeClientActions(store, service);
      const created = await service.create(
        input("logistics-key-1", "9903000033"),
      );
      await makeWorker(store, service).drain();
      const application = await service.getApplication(created.application.id);
      assert.equal(application.status, "needs_client");
      assert.deepEqual(application.requestedInfo, [
        "Подтвердите ИНН по регистрационным документам",
      ]);
      assert.equal(application.offer, null);
      assert.equal(application.scoring?.score, 70);

      const rows = await db.query(
        "select source, status from source_checks where job_id=$1 order by source",
        [created.checkJob.id],
      );
      assert.deepEqual(
        rows.map((r: { source: string; status: string }) => [
          r.source,
          r.status,
        ]),
        [
          ["bki", "ok"],
          ["egrul", "ok"],
          ["fns", "ok"],
          ["scoring", "ok"],
        ],
      );
      const events = await store.listEvents(created.application.id);
      const auto = events.find(
        (event) =>
          event.kind === "status_changed" &&
          event.metadata.actionType === "auto_request_info",
      );
      assert.ok(auto, "переход в NEEDS_INFO аудитируется");
      assert.equal(auto.metadata.toStatus, "needs_client");
      assert.equal(auto.metadata.fromStatus, "in_review");
      assert.equal(auto.metadata.actorKind, "system");
      assert.match(String(auto.metadata.reasons), /ИНН источника/);

      // Клиент отвечает: заявка возвращается на рассмотрение, процесс продолжается.
      const response = await clientActions.execute(
        created.application.id,
        {
          action: {
            type: "answer_request",
            answer: { text: "Подтверждаю ИНН 9903000033", documents: [] },
          },
          idempotencyKey: "answer-auto-req-001",
        },
        logisticsSession,
      );
      assert.equal(response.application.status, "UNDER_REVIEW");
      const answered = await service.getApplication(created.application.id);
      assert.equal(answered.status, "in_review");
      assert.equal(answered.clientReply?.text, "Подтверждаю ИНН 9903000033");
      assert.deepEqual(answered.requestedInfo, [
        "Подтвердите ИНН по регистрационным документам",
      ]);

      // Повторная проверка с тем же расхождением не дублирует запрос.
      await service.startCheck(created.application.id, {
        idempotencyKey: "recheck-auto-1",
      });
      await makeWorker(store, service).drain();
      const afterRecheck = await service.getApplication(created.application.id);
      assert.equal(afterRecheck.status, "in_review");
      assert.deepEqual(afterRecheck.requestedInfo, [
        "Подтвердите ИНН по регистрационным документам",
      ]);
      const autoEvents = (
        await store.listEvents(created.application.id)
      ).filter(
        (event) =>
          event.kind === "status_changed" &&
          event.metadata.actionType === "auto_request_info",
      );
      assert.equal(autoEvents.length, 1);
    });
  },
);
