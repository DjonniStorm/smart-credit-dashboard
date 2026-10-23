import assert from "node:assert/strict";
import test from "node:test";

import {
  CREDIT_PRODUCTS,
  creditProductIdSchema,
  creditProductSchema,
  productRate,
} from "../src/product-catalog.ts";

test("каталог содержит ровно четыре продукта из plan.md", () => {
  assert.deepEqual(
    CREDIT_PRODUCTS.map((product) => product.id),
    creditProductIdSchema.options,
  );
  for (const product of CREDIT_PRODUCTS) {
    assert.equal(creditProductSchema.safeParse(product).success, true);
  }
});

test("лимиты оборотного кредита совпадают с планом", () => {
  const product = CREDIT_PRODUCTS.find((item) => item.id === "working_capital");
  assert.equal(product?.minAmount, 300_000);
  assert.equal(product?.maxAmount, 10_000_000);
  assert.equal(product?.minTermMonths, 3);
  assert.equal(product?.maxTermMonths, 24);
});

test("обеспечение указано явно: null только там, где оно не требуется", () => {
  const collateral = Object.fromEntries(
    CREDIT_PRODUCTS.map((product) => [product.id, product.collateral]),
  );
  assert.equal(collateral.working_capital, null);
  assert.equal(collateral.cash_gap, null);
  assert.equal(
    collateral.equipment,
    "Приобретаемое оборудование или транспорт",
  );
  assert.equal(collateral.development, "Поручительство собственника");
  assert.equal(
    creditProductSchema.safeParse({
      ...CREDIT_PRODUCTS[0],
      collateral: undefined,
    }).success,
    false,
  );
});

test("ставка = ключевая + спред + надбавка грейда", () => {
  const [product] = CREDIT_PRODUCTS;
  assert.equal(productRate(product, 14), 14 + product.spreadPp);
  assert.equal(productRate(product, 16, 2), 16 + product.spreadPp + 2);
});
