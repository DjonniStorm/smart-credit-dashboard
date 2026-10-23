import assert from "node:assert/strict";
import test from "node:test";

import { BadRequestException } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";

import { CreateApplicationDto } from "../src/modules/applications/applications.controller.ts";

// Та же проверка, что глобальный APP_PIPE делает для POST /v1/applications.
const pipe = new ZodValidationPipe();
const valid = {
  inn: "7701234567",
  productId: "working_capital",
  amount: 1_000_000,
  termMonths: 12,
  purpose: "working_capital",
  idempotencyKey: "purpose-http-1",
};

function rejectedPaths(body: unknown): string[] {
  try {
    pipe.transform(body, { type: "body", metatype: CreateApplicationDto });
  } catch (error) {
    assert.ok(error instanceof BadRequestException);
    assert.equal(error.getStatus(), 400);
    const response = error.getResponse() as { errors: { path: string[] }[] };
    return response.errors.map((issue) => issue.path.join("."));
  }
  return [];
}

test("заявка с целью и условиями из каталога проходит", () => {
  assert.deepEqual(rejectedPaths(valid), []);
});

test("цель свободным текстом даёт 400 по purpose", () => {
  assert.deepEqual(
    rejectedPaths({ ...valid, purpose: "Пополнение оборотных средств" }),
    ["purpose"],
  );
});

test("цель чужого продукта даёт 400 по purpose", () => {
  assert.deepEqual(
    rejectedPaths({
      ...valid,
      productId: "equipment",
      purpose: "development",
      amount: 1_000_000,
      termMonths: 24,
    }),
    ["purpose"],
  );
});

test("сумма и срок вне лимитов продукта дают 400 по amount и termMonths", () => {
  assert.deepEqual(rejectedPaths({ ...valid, amount: 1, termMonths: 600 }), [
    "amount",
    "termMonths",
  ]);
});
