import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiProductCatalog } from "@repo/contracts/api";
import {
  CREDIT_PRODUCTS,
  DEFAULT_KEY_RATE,
} from "@repo/contracts/product-catalog";

import type { Env } from "../../common/config/env.schema.ts";

@Injectable()
export class CatalogService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  getCatalog(): ApiProductCatalog {
    return {
      keyRate: this.config.getOrThrow("KEY_RATE_PERCENT", { infer: true }),
      keyRateDate: DEFAULT_KEY_RATE.date,
      products: CREDIT_PRODUCTS.map((product) => ({ ...product })),
    };
  }
}
