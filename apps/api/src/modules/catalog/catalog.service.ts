import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { ApiProductCatalog } from "@repo/contracts/api";

import { DemoDataStore } from "../../common/demo-data/demo-data.store.ts";

@Injectable()
export class CatalogService {
  constructor(private readonly data: DemoDataStore) {}

  async getCatalog(): Promise<ApiProductCatalog> {
    const catalog = await this.data.getCatalog();
    if (catalog.products.length === 0) {
      throw new ServiceUnavailableException(
        "Демо-данные не загружены. Выполните pnpm --filter api db:seed",
      );
    }
    return catalog;
  }
}
