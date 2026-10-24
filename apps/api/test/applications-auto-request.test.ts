import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

import { DataSource } from "typeorm";

import type { DemoSession } from "@repo/contracts/api";

import { runMigrations } from "../src/common/database/migration-runner.ts";
import { DemoDataStore } from "../src/common/demo-data/demo-data.store.ts";
import { toApiApplication } from "../src/modules/applications/api-mapper.ts";
import { ApplicationsService } from "../src/modules/applications/applications.service.ts";
import { ClientActionsService } from "../src/modules/applications/client-actions.service.ts";
import { QueueWorkerService } from "../src/modules/applications/queue-worker.service.ts";
import { WorkflowStore } from "../src/modules/applications/workflow-store.ts";
import {
  cleanResult,
  logisticsResult,
} from "./applications-auto-request-fixtures.ts";

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

/** Клиентская сессия компании логистики (9903000033). */
const logisticsSession = {
  account: { person: "Ольга Путева", company: { inn: "9903000033" } },
  role: "client",
} as DemoSession;

describe(
  "автоматический запрос по расхождению источников",
  {
    skip:
      databaseUrl || databaseRequired ? false : "TEST_DATABASE_URL не задан",
  },
  () => {
    const schema = `t_${randomUUID().replaceAll("-", "")}`;
    let db: DataSource;
    let companyCheck: () => Promise<typeof cleanResult>;

    const makeStore = () => new WorkflowStore(db);
    const makeService = (store: WorkflowStore) =>
      new ApplicationsService(
        { check: () => companyCheck() } as never,
        {} as never,
        {} as never,
        store,
        new DemoDataStore(db),
      );
    const makeWorker = (store: WorkflowStore, service: ApplicationsService) =>
      new QueueWorkerService(
        store,
        service,
        { prepareContracts: async () => 0 } as never,
        { getOrThrow: () => 60_000 } as never,
      );
    const makeClientActions = (
      store: WorkflowStore,
      service: ApplicationsService,
    ) =>
      new ClientActionsService(store, {
        getApiApplication: async (applicationId: string) =>
          toApiApplication(await service.getApplication(applicationId)),
      } as never);

    before(async () => {
      const admin = new DataSource({ type: "postgres", url: databaseUrl });
      await admin.initialize();
      await admin.query(`create schema ${schema}`);
      await admin.destroy();
      db = new DataSource({
        type: "postgres",
        url: databaseUrl,
        extra: { options: `-c search_path=${schema}` },
      });
      await db.initialize();
      await runMigrations(db);
    });

    after(async () => {
      await db.query(`drop schema ${schema} cascade`);
      await db.destroy();
    });

    test("без расхождений автоматический запрос не создаётся", async () => {
      companyCheck = async () => cleanResult;
      const store = makeStore();
      const service = makeService(store);
      const created = await service.create(input("clean-key-1", "7701234567"));
      await makeWorker(store, service).drain();
      const application = await service.getApplication(created.application.id);
      assert.notEqual(application.status, "needs_client");
      assert.deepEqual(application.requestedInfo, []);
      assert.equal(application.scoring?.score, 82);
    });

    test("расхождение источников переводит заявку в NEEDS_INFO с запросом клиенту", async () => {
      companyCheck = async () => logisticsResult;
      const store = makeStore();
      const service = makeService(store);
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

    test("повторная проверка при открытом запросе не промоутнет заявку", async () => {
      const store = makeStore();
      const service = makeService(store);
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
      const completed = await store.completeJob(job, {
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
      });
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
      const store = makeStore();
      const service = makeService(store);
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
      await store.completeJob(job, {
        result: { score: 85, model: "baseline-v1" },
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
      });
      const after = await service.getApplication(created.application.id);
      assert.equal(after.status, "approved");
      assert.ok(after.offer);
    });
  },
);
