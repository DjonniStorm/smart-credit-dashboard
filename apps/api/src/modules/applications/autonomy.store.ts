import { Injectable, OnModuleInit, ServiceUnavailableException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { ApiProductId, ApiAutonomySnapshot } from "@repo/contracts/api";
import {
  autonomyConfigSchema,
  autonomyMetricsSchema,
  checkAutonomyEligibility,
} from "@repo/contracts";
import type { DataSource } from "typeorm";

@Injectable()
export class AutonomyStore implements OnModuleInit {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSchema();
  }

  async getSnapshot(productId: ApiProductId): Promise<ApiAutonomySnapshot> {
    const rows = await this.db.query(
      "select payload from autonomy_policies where product_id=$1",
      [productId],
    );
    if (!rows[0]) {
      throw new ServiceUnavailableException(
        `Политика автономности не найдена для ${productId}; выполните db:seed`,
      );
    }
    const config = autonomyConfigSchema.parse(rows[0].payload.config);
    const metrics = autonomyMetricsSchema.parse(rows[0].payload.metrics);
    return {
      config,
      metrics,
      eligibility: checkAutonomyEligibility(config, metrics),
    };
  }

  private async ensureSchema(): Promise<void> {
    await this.db.query(`
      create table if not exists autonomy_policies (
        product_id text primary key,
        payload jsonb not null
      )
    `);
  }
}
