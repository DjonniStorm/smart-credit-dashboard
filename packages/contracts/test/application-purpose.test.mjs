import assert from "node:assert/strict";
import test from "node:test";

import { apiCreateApplicationSchema } from "../src/api.ts";
import { createApplicationRequestSchema } from "../src/workflow.ts";

const valid = {
  inn: "7701234567",
  productId: "working_capital",
  amount: 1_000_000,
  termMonths: 12,
  purpose: "working_capital",
  idempotencyKey: "purpose-test-1",
};

for (const [name, schema] of [
  ["api", apiCreateApplicationSchema],
  ["workflow", createApplicationRequestSchema],
]) {
  test(`${name}: цель из каталога продукта принимается`, () => {
    assert.equal(schema.safeParse(valid).success, true);
    assert.equal(
      schema.safeParse({
        ...valid,
        productId: "cash_gap",
        purpose: "working_capital",
      }).success,
      true,
    );
  });

  test(`${name}: свободный текст вместо цели отклоняется`, () => {
    const result = schema.safeParse({
      ...valid,
      purpose: "Пополнение оборотных средств",
    });
    assert.equal(result.success, false);
    assert.deepEqual(result.error.issues[0].path, ["purpose"]);
  });

  test(`${name}: цель чужого продукта отклоняется`, () => {
    const result = schema.safeParse({
      ...valid,
      productId: "equipment",
      purpose: "development",
    });
    assert.equal(result.success, false);
    assert.deepEqual(result.error.issues[0].path, ["purpose"]);
  });
}
