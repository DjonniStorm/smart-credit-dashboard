import assert from "node:assert/strict";
import test from "node:test";

import { ApplicationsService } from "../src/modules/applications/applications.service.ts";

const checkResult = {
  inn: "7701234567",
  sources: {
    egrul: { inn: "7701234567", ogrn: "1", name: "ООО Тест", status: "Действующее", registeredAt: "2020-01-01", okved: "47.11" },
    bki: { inn: "7701234567", activeLoans: 1, totalDebtRub: 100, overdueDays: 0 },
    fns: { inn: "7701234567", taxDebtRub: 0, employees: 2, massRegistrationAddress: false },
  },
  scoring: { inn: "7701234567", score: 82, model: "baseline-v1" },
};

function service() {
  return new ApplicationsService({ check: async () => checkResult } as never);
}

test("create is idempotent and persists scoring result", async () => {
  const applications = service();
  const input = { inn: "7701234567", productId: "working_capital", amount: 500_000, termMonths: 12, purpose: "Оборотные средства", idempotencyKey: "create-key-1" } as const;
  const first = applications.create(input);
  const second = applications.create(input);
  assert.equal(second.application.id, first.application.id);
  assert.equal(second.checkJob.id, first.checkJob.id);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(applications.getJob(first.checkJob.id).status, "succeeded");
  assert.equal(applications.getApplication(first.application.id).scoring?.score, 82);
});

test("repeated check key returns the same job", async () => {
  const applications = service();
  const created = applications.create({
    inn: "7701234567", productId: "express", amount: 100_000, termMonths: 6,
    purpose: "Пополнение оборота", idempotencyKey: "create-key-2",
  });
  const first = applications.startCheck(created.application.id, { idempotencyKey: "check-key-1" });
  const second = applications.startCheck(created.application.id, { idempotencyKey: "check-key-1" });
  assert.equal(first.id, second.id);
});
