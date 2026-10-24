import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

import type { DataSource } from "typeorm";

import {
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

const approveOutcome = {
  result: { score: 80, model: "baseline-v1" },
  decision: {
    recommendation: "approve",
    reasons: [],
    rules: [],
    autonomyMode: "assist",
  },
  status: "approved",
  offer: {
    productId: "working_capital",
    amount: 500_000,
    termMonths: 12,
    ratePct: 16,
  },
  checks: [],
  eventPayload: {},
} as const;

describe(
  "гонки проверок при открытом запросе клиента",
  {
    skip:
      databaseUrl || databaseRequired ? false : "TEST_DATABASE_URL не задан",
  },
  () => {
    let db: DataSource;
    let schema: string;
    let companyCheck: () => Promise<typeof logisticsResult>;

    if (databaseUrl) {
      before(async () => {
        ({ db, schema } = await provisionDatabase(databaseUrl));
      });
      after(async () => {
        await teardownDatabase(db, schema);
      });
    }

    test("повторная проверка при открытом запросе не промоутнет заявку", async () => {
      companyCheck = async () => logisticsResult;
      const store = makeStore(db);
      const service = makeService(db, () => companyCheck());
      const created = await service.create(
        input("logistics-key-2", "9903000033"),
      );
      await makeWorker(store, service).drain();
      const application = await service.getApplication(created.application.id);
      assert.equal(application.status, "needs_client");
      assert.ok(application.requestedInfo.length > 0);

      // Гонка: вторая задача завершается решением approve с оффером, пока запрос
      // клиента открыт. До фикса CASE-guard она перезаписала бы статус на approved.
      await service.startCheck(created.application.id, {
        idempotencyKey: "recheck-while-open-1",
      });
      const job = await store.claimNextQueuedJob();
      assert.ok(job, "вторая задача взята в работу");
      const completed = await store.completeJob(job, approveOutcome);
      assert.equal(completed, true);
      const after = await service.getApplication(created.application.id);
      assert.equal(after.status, "needs_client");
      assert.equal(after.offer, null);
      assert.deepEqual(after.requestedInfo, [
        "Подтвердите ИНН по регистрационным документам",
      ]);
      assert.equal(after.scoring?.score, 80);
      const autoEvents = (
        await store.listEvents(created.application.id)
      ).filter(
        (event) =>
          event.kind === "status_changed" &&
          event.metadata.actionType === "auto_request_info",
      );
      assert.equal(autoEvents.length, 1);
    });

    test("после ответа клиента повторная проверка может перевести заявку в approved", async () => {
      companyCheck = async () => logisticsResult;
      const store = makeStore(db);
      const service = makeService(db, () => companyCheck());
      const clientActions = makeClientActions(store, service);
      const created = await service.create(
        input("logistics-key-3", "9903000033"),
      );
      await makeWorker(store, service).drain();
      assert.equal(
        (await service.getApplication(created.application.id)).status,
        "needs_client",
      );
      await clientActions.execute(
        created.application.id,
        {
          action: {
            type: "answer_request",
            answer: { text: "Подтверждаю ИНН 9903000033", documents: [] },
          },
          idempotencyKey: "answer-auto-req-003",
        },
        logisticsSession,
      );
      assert.equal(
        (await service.getApplication(created.application.id)).status,
        "in_review",
      );

      // После ответа запрос закрыт, и approve-результат проверки не блокируется.
      await service.startCheck(created.application.id, {
        idempotencyKey: "recheck-after-answer-1",
      });
      const job = await store.claimNextQueuedJob();
      assert.ok(job);
      await store.completeJob(job, approveOutcome);
      const after = await service.getApplication(created.application.id);
      assert.equal(after.status, "approved");
      assert.ok(after.offer);
    });

    test("если автозапрос не применился, факты пишутся, событие успеха честное", async () => {
      companyCheck = async () => logisticsResult;
      const store = makeStore(db);
      const service = makeService(db, () => companyCheck());
      const created = await service.create(
        input("logistics-key-4", "9903000033"),
      );
      await makeWorker(store, service).drain();
      const application = await service.getApplication(created.application.id);
      assert.equal(application.status, "needs_client");
      assert.deepEqual(application.requestedInfo, [
        "Подтвердите ИНН по регистрационным документам",
      ]);

      // Вторая задача завершается с clientRequest, но состояние уже уехало:
      // статусная часть не применится, факты обязаны записаться.
      await service.startCheck(created.application.id, {
        idempotencyKey: "recheck-late-1",
      });
      const job = await store.claimNextQueuedJob();
      assert.ok(job);
      await store.completeJob(job, {
        result: { score: 90, model: "baseline-v1" },
        decision: {
          recommendation: "approve",
          reasons: [],
          rules: [],
          autonomyMode: "assist",
        },
        status: "needs_client",
        clientRequest: {
          items: ["Не должно примениться"],
          reasons: ["гонка"],
        },
        checks: [],
        eventPayload: {
          reportContext: { version: 1, status: "approved", stage: "decision" },
        },
      });

      const after = await service.getApplication(created.application.id);
      assert.equal(after.status, "needs_client");
      assert.deepEqual(after.requestedInfo, [
        "Подтвердите ИНН по регистрационным документам",
      ]);
      assert.equal(after.scoring?.score, 90);

      const events = await store.listEvents(created.application.id);
      const autoEvents = events.filter(
        (event) =>
          event.kind === "status_changed" &&
          event.metadata.actionType === "auto_request_info",
      );
      assert.equal(autoEvents.length, 1);
      const lastScored = [...events]
        .reverse()
        .find((event) => event.kind === "scoring_succeeded");
      assert.ok(lastScored);
      assert.equal(lastScored.metadata.reportContext?.status, "needs_client");
    });
  },
);
