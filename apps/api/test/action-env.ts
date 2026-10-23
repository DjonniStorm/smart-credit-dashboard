import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import baseTest, { after, before } from "node:test";

import { DataSource } from "typeorm";

import type { EmployeeAction } from "@repo/contracts/application";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

import { runMigrations } from "../src/common/database/migration-runner.ts";
import { DemoDataStore } from "../src/common/demo-data/demo-data.store.ts";
import { demoEmployees } from "../src/common/demo-data/demo-data.ts";
import { ApplicationActionsService } from "../src/modules/applications/application-actions.service.ts";
import { WorkflowStore } from "../src/modules/applications/workflow-store.ts";
import { catalog } from "./action-fixtures.ts";

// Тесты идут против настоящего Postgres: блокировка строки и идемпотентность
// держатся на SQL, на памяти их не проверить. Каждый прогон живёт в своей схеме.
// Локально: `pnpm db:up` и TEST_DATABASE_URL=postgres://alfa:alfa@localhost:5432/alfa.
const databaseUrl = process.env.TEST_DATABASE_URL;
const schema = `t_${randomUUID().replaceAll("-", "")}`;

export const analyst = demoEmployees[0]!;
export const lead = demoEmployees.find((employee) => employee.role === "lead")!;
export const approve: EmployeeAction = {
  type: "approve",
  comment: "Всё в порядке",
};

// Живые привязки: файл тестов видит значения после before().
export let db: DataSource;
export let store: WorkflowStore;
export let actions: ApplicationActionsService;

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

export const test = databaseUrl
  ? baseTest
  : (name: string) => baseTest.skip(`${name} (TEST_DATABASE_URL не задан)`);

let counter = 0;
export function act(
  id: string,
  action: EmployeeAction,
  employee = analyst,
  idempotencyKey = `key-${Date.now()}-${(counter += 1)}`,
) {
  return actions.execute(id, { action, idempotencyKey }, employee);
}

export async function reload(id: string): Promise<ApplicationWorkflow> {
  const application = await store.getApplication(id);
  assert.ok(application);
  return application;
}
