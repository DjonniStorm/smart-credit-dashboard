import { randomUUID } from "node:crypto";

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

export { cleanResult, logisticsResult };

/** Клиентская сессия компании логистики (9903000033). */
export const logisticsSession = {
  account: { person: "Ольга Путева", company: { inn: "9903000033" } },
  role: "client",
} as DemoSession;

export const makeStore = (db: DataSource) => new WorkflowStore(db);

export const makeService = (
  db: DataSource,
  companyCheck: () => Promise<typeof cleanResult>,
) =>
  new ApplicationsService(
    { check: () => companyCheck() } as never,
    {} as never,
    {} as never,
    makeStore(db),
    new DemoDataStore(db),
  );

export const makeWorker = (
  store: WorkflowStore,
  service: ApplicationsService,
) =>
  new QueueWorkerService(
    store,
    service,
    { prepareContracts: async () => 0 } as never,
    { getOrThrow: () => 60_000 } as never,
  );

export const makeClientActions = (
  store: WorkflowStore,
  service: ApplicationsService,
) =>
  new ClientActionsService(store, {
    getApiApplication: async (applicationId: string) =>
      toApiApplication(await service.getApplication(applicationId)),
  } as never);

/** Изолированная схема с миграциями для Postgres-тестов. */
export async function provisionDatabase(
  databaseUrl: string,
): Promise<{ db: DataSource; schema: string }> {
  const schema = `t_${randomUUID().replaceAll("-", "")}`;
  const admin = new DataSource({ type: "postgres", url: databaseUrl });
  await admin.initialize();
  await admin.query(`create schema ${schema}`);
  await admin.destroy();
  const db = new DataSource({
    type: "postgres",
    url: databaseUrl,
    extra: { options: `-c search_path=${schema}` },
  });
  await db.initialize();
  await runMigrations(db);
  return { db, schema };
}

export async function teardownDatabase(
  db: DataSource,
  schema: string,
): Promise<void> {
  await db.query(`drop schema ${schema} cascade`);
  await db.destroy();
}
