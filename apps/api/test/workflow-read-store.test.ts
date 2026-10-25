import assert from "node:assert/strict";
import test from "node:test";

import type { DataSource } from "typeorm";

import { WorkflowReadStore } from "../src/modules/applications/workflow-read-store.ts";
import { WorkflowTransaction } from "../src/modules/applications/workflow-transaction.ts";

test("компания ограничивает SQL списка до чтения строк, ИНН параметризован", async () => {
  const calls: { sql: string; parameters: unknown[] }[] = [];
  const db = {
    query: async (sql: string, parameters: unknown[]) => {
      calls.push({ sql, parameters });
      return [];
    },
  } as unknown as DataSource;
  const store = new WorkflowReadStore(db);
  const inn = "123' OR 1=1 --";
  assert.deepEqual(await store.list(inn), []);
  assert.match(calls[0]!.sql, /where inn=\$1/);
  assert.deepEqual(calls[0]!.parameters, [inn]);
  assert.equal(calls[0]!.sql.includes(inn), false);
  await store.get("application", inn);
  assert.match(calls[1]!.sql, /where id=\$1 and inn=\$2/);
  assert.deepEqual(calls[1]!.parameters, ["application", inn]);
  assert.equal(calls.length, 2);
});

test("истечение оффера тоже блокирует только строку текущей компании", async () => {
  const calls: { sql: string; parameters: unknown[] }[] = [];
  const tx = new WorkflowTransaction({
    query: async (sql: string, parameters: unknown[]) => {
      calls.push({ sql, parameters });
      return [];
    },
  } as never);
  assert.equal(await tx.lockApplication("id", "company"), null);
  assert.match(calls[0]!.sql, /id=\$1 and inn=\$2 for update/);
  assert.deepEqual(calls[0]!.parameters, ["id", "company"]);
});

test("банковская очередь сохраняет чтение без ограничения клиентом", async () => {
  const calls: string[] = [];
  const store = new WorkflowReadStore({
    query: async (sql: string) => {
      calls.push(sql);
      return [];
    },
  } as unknown as DataSource);
  await store.list();
  assert.equal(calls[0]!.includes("where inn="), false);
});

test("карточка использует уже заблокированную строку без второго SELECT заявки", async () => {
  const { ApplicationsService } =
    await import("../src/modules/applications/applications.service.ts");
  const { applicationFromRow } =
    await import("../src/modules/applications/workflow-rows.ts");
  const application = applicationFromRow({
    id: "id",
    number: "number",
    inn: "company",
    product_id: "working_capital",
    amount: 100000,
    term_months: 12,
    purpose: "working_capital",
    status: "in_review",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  });
  const calls: string[] = [];
  const store = {
    expireAutoOffer: async (id: string, inn: string) => {
      assert.equal(id, "id");
      assert.equal(inn, "company");
      calls.push("scoped-lock");
      return application;
    },
    getApplication: async () => {
      throw new Error("Повторная выборка заявки");
    },
    listComments: async () => {
      return [];
    },
  };
  const service = new ApplicationsService(
    {} as never,
    {} as never,
    {} as never,
    store as never,
    {} as never,
  );
  assert.equal((await service.getApiApplication("id", "company")).id, "id");
  assert.deepEqual(calls, ["scoped-lock"]);
});
