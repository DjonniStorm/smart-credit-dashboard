import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";

import { DataSource } from "typeorm";

import { runMigrations } from "../src/common/database/migration-runner.ts";
import { ApplicationsService } from "../src/modules/applications/applications.service.ts";
import { QueueWorkerService } from "../src/modules/applications/queue-worker.service.ts";
import {
  MAX_JOB_ATTEMPTS,
  WorkflowStore,
} from "../src/modules/applications/workflow-store.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;

const checkResult = {
  inn: "7701234567",
  sources: {
    egrul: {
      inn: "7701234567",
      ogrn: "1",
      name: "ООО Тест",
      status: "Действующее",
      registeredAt: "2020-01-01",
      okved: "47.11",
    },
    bki: {
      inn: "7701234567",
      activeLoans: 1,
      totalDebtRub: 100,
      overdueDays: 0,
    },
    fns: {
      inn: "7701234567",
      taxDebtRub: 0,
      employees: 2,
      massRegistrationAddress: false,
    },
  },
  scoring: { inn: "7701234567", score: 82, model: "baseline-v1" },
};

const input = (idempotencyKey: string, inn = "7701234567") =>
  ({
    inn,
    productId: "working_capital",
    amount: 500_000,
    termMonths: 12,
    purpose: "Оборотные средства",
    idempotencyKey,
  }) as const;

/** Хранилище, у которого можно сломать запись результата и/или перевод в retry, как при сбое Postgres. */
class FlakyStore extends WorkflowStore {
  failComplete = false;
  failRetry = false;

  override async completeJob(
    ...args: Parameters<WorkflowStore["completeJob"]>
  ): Promise<void> {
    if (this.failComplete) {
      throw new Error("db unavailable: completeJob");
    }
    return super.completeJob(...args);
  }

  override async failJob(
    ...args: Parameters<WorkflowStore["failJob"]>
  ): ReturnType<WorkflowStore["failJob"]> {
    if (this.failRetry) {
      throw new Error("db unavailable: failJob");
    }
    return super.failJob(...args);
  }
}

describe(
  "applications workflow on Postgres",
  { skip: databaseUrl ? false : "TEST_DATABASE_URL не задан" },
  () => {
    const schema = `t_${randomUUID().replaceAll("-", "")}`;
    let db: DataSource;
    let companyCheck: () => Promise<typeof checkResult>;

    const makeStore = () => new FlakyStore(db);
    const makeService = (store: WorkflowStore) =>
      new ApplicationsService({ check: () => companyCheck() } as never, store);
    const makeWorker = (
      store: WorkflowStore,
      service: ApplicationsService,
      leaseMs = 60_000,
    ) =>
      new QueueWorkerService(store, service, { get: () => leaseMs } as never);

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

    test("повторный прогон миграций ничего не применяет", async () => {
      assert.deepEqual(await runMigrations(db), []);
    });

    test("create идемпотентен, воркер сохраняет результат скоринга", async () => {
      companyCheck = async () => checkResult;
      const store = makeStore();
      const service = makeService(store);
      const first = await service.create(input("create-key-1"));
      const second = await service.create(input("create-key-1"));
      assert.equal(second.application.id, first.application.id);
      assert.equal(second.checkJob.id, first.checkJob.id);

      await makeWorker(store, service).drain();
      const job = await service.getJob(first.checkJob.id);
      assert.equal(job.status, "succeeded");
      assert.equal(job.attempts, 1);
      assert.equal(
        (await service.getApplication(first.application.id)).scoring?.score,
        82,
      );
    });

    test("параллельные create с одним ключом создают одну заявку", async () => {
      const service = makeService(makeStore());
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          service.create(input("race-key-001", "7702345678")),
        ),
      );
      assert.equal(new Set(results.map((r) => r.application.id)).size, 1);
      const [{ count }] = await db.query(
        "select count(*)::int as count from applications where inn='7702345678'",
      );
      assert.equal(count, 1);
    });

    test("повторная проверка с тем же ключом возвращает ту же задачу", async () => {
      const service = makeService(makeStore());
      const created = await service.create(input("create-key-2", "7703456789"));
      const [first, second] = await Promise.all([
        service.startCheck(created.application.id, {
          idempotencyKey: "check-key-1",
        }),
        service.startCheck(created.application.id, {
          idempotencyKey: "check-key-1",
        }),
      ]);
      assert.equal(first.id, second.id);
    });

    test("рестарт сервиса не перезаписывает чужие заявки", async () => {
      const before = await makeService(makeStore()).create(
        input("restart-key-1", "7704567890"),
      );
      const afterRestart = await makeService(makeStore()).create(
        input("restart-key-2", "7705678901"),
      );
      assert.notEqual(afterRestart.application.id, before.application.id);
      assert.notEqual(
        afterRestart.application.number,
        before.application.number,
      );
      assert.notEqual(afterRestart.checkJob.id, before.checkJob.id);
      const stored = await makeService(makeStore()).getApplication(
        before.application.id,
      );
      assert.equal(stored.inn, "7704567890");
    });

    test("ошибка БД в джобе не роняет процесс: retry с ростом attempts, затем failed", async () => {
      companyCheck = async () => checkResult;
      const store = makeStore();
      store.failComplete = true;
      const service = makeService(store);
      const worker = makeWorker(store, service);
      const created = await service.create(
        input("retry-key-001", "7706789012"),
      );

      for (let attempt = 1; attempt <= MAX_JOB_ATTEMPTS; attempt += 1) {
        await worker.drain();
        const job = await service.getJob(created.checkJob.id);
        assert.equal(job.attempts, attempt);
        assert.match(job.error ?? "", /db unavailable/);
        if (attempt < MAX_JOB_ATTEMPTS) {
          assert.equal(job.status, "queued");
          const [{ next_attempt_at: nextAttemptAt }] = await db.query(
            "select next_attempt_at from scoring_jobs where id=$1",
            [job.id],
          );
          assert.ok(nextAttemptAt, "next_attempt_at выставлен");
          await worker.drain();
          assert.equal(
            (await service.getJob(job.id)).attempts,
            attempt,
            "до next_attempt_at задача не берётся",
          );
          await db.query(
            "update scoring_jobs set next_attempt_at=now() where id=$1",
            [job.id],
          );
        } else {
          assert.equal(job.status, "failed");
          assert.ok(job.finishedAt);
        }
      }
      assert.equal(
        (await service.getApplication(created.application.id)).scoring,
        null,
      );
    });

    test("зависшая в running задача возвращается в очередь и доделывается", async () => {
      companyCheck = async () => checkResult;
      const store = makeStore();
      store.failComplete = true;
      store.failRetry = true;
      const service = makeService(store);
      const created = await service.create(
        input("stale-key-001", "7707890123"),
      );

      await makeWorker(store, service).drain();
      assert.equal(
        (await service.getJob(created.checkJob.id)).status,
        "running",
        "запись retry тоже упала",
      );

      store.failComplete = false;
      store.failRetry = false;
      await makeWorker(store, service).drain();
      assert.equal(
        (await service.getJob(created.checkJob.id)).status,
        "running",
        "аренда ещё не истекла",
      );

      await db.query(
        "update scoring_jobs set started_at = now() - interval '5 minutes' where id=$1",
        [created.checkJob.id],
      );
      await makeWorker(store, service).drain();
      const job = await service.getJob(created.checkJob.id);
      assert.equal(job.status, "succeeded");
      assert.equal(job.attempts, 2);
    });

    test("зависшая задача без оставшихся попыток уходит в failed", async () => {
      const store = makeStore();
      const service = makeService(store);
      const created = await service.create(
        input("stale-key-002", "7708901234"),
      );
      await db.query(
        "update scoring_jobs set status='running', attempts=$2, started_at = now() - interval '5 minutes' where id=$1",
        [created.checkJob.id, MAX_JOB_ATTEMPTS],
      );
      await makeWorker(store, service).drain();
      assert.equal(
        (await service.getJob(created.checkJob.id)).status,
        "failed",
      );
    });
  },
);
