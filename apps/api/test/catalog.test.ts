import assert from "node:assert/strict";
import test from "node:test";

import { apiProductCatalogSchema } from "@repo/contracts/api";
import {
  CREDIT_PRODUCTS,
  DEFAULT_KEY_RATE,
} from "@repo/contracts/product-catalog";

import { CatalogService } from "../src/modules/catalog/catalog.service.ts";

function service(keyRate: number) {
  return new CatalogService({
    getOrThrow: () => keyRate,
  } as never);
}

test("каталог отдаёт ровно CREDIT_PRODUCTS и проходит схему", () => {
  const catalog = service(DEFAULT_KEY_RATE.value).getCatalog();
  assert.deepEqual(catalog.products, [...CREDIT_PRODUCTS]);
  assert.equal(apiProductCatalogSchema.safeParse(catalog).success, true);
});

test("ключевая ставка берётся из конфигурации", () => {
  assert.equal(service(16.5).getCatalog().keyRate, 16.5);
});
