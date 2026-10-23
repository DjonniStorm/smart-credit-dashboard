import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";

import type {
  ApiAutonomyAudit,
  ApiAutonomySnapshot,
  ApiProductId,
  AutonomyPolicyActionRequest,
} from "@repo/contracts/api";
import {
  autonomyConfigSchema,
  autonomyMetricsSchema,
  checkAutonomyEligibility,
} from "@repo/contracts";
import type { AutonomyLevel } from "@repo/contracts";
import type { Employee } from "@repo/contracts/application";
import type { DataSource, EntityManager } from "typeorm";

type Row = Record<string, unknown>;

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as Row[];
  }
  return result as Row[];
}

@Injectable()
export class AutonomyStore {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async getSnapshot(
    productId: ApiProductId,
    autonomyCase: ApiAutonomySnapshot["case"] = null,
  ): Promise<ApiAutonomySnapshot> {
    const rows = rowsOf(
      await this.db.query(
        "select payload from autonomy_policies where product_id=$1",
        [productId],
      ),
    );
    return this.snapshotFromRow(rows[0], autonomyCase, productId);
  }

  async listSnapshots(): Promise<ApiAutonomySnapshot[]> {
    const rows = rowsOf(
      await this.db.query(
        "select product_id, payload from autonomy_policies order by product_id",
      ),
    );
    return rows.map((row) =>
      this.snapshotFromRow(row, null, String(row.product_id) as ApiProductId),
    );
  }

  async listAudit(productId: ApiProductId): Promise<ApiAutonomyAudit[]> {
    const rows = rowsOf(
      await this.db.query(
        `select product_id, policy_id, application_id, actor_id, actor_role,
                action, from_level, to_level, reason, idempotency_key, metrics_before,
                metrics_after, created_at
           from autonomy_policy_audits
          where product_id=$1
          order by created_at desc`,
        [productId],
      ),
    );
    return rows.map((row) => ({
      productId: String(row.product_id),
      policyId: String(row.policy_id),
      applicationId: row.application_id ? String(row.application_id) : null,
      actorId: String(row.actor_id),
      actorRole: String(row.actor_role),
      action: String(row.action),
      fromLevel: row.from_level as ApiAutonomyAudit["fromLevel"],
      toLevel: row.to_level as ApiAutonomyAudit["toLevel"],
      reason: String(row.reason),
      idempotencyKey: String(row.idempotency_key),
      metricsBefore: row.metrics_before as ApiAutonomyAudit["metricsBefore"],
      metricsAfter: row.metrics_after as ApiAutonomyAudit["metricsAfter"],
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  }

  async applyPolicyAction(
    productId: ApiProductId,
    request: AutonomyPolicyActionRequest,
    employee: Employee,
  ): Promise<ApiAutonomySnapshot> {
    if (employee.role !== "lead") {
      throw new ForbiddenException("Менять policy может только руководитель");
    }
    return this.db.transaction(async (manager) => {
      const row = await this.lockPolicy(manager, productId);
      const current = this.snapshotFromRow(row, null, productId);
      const existing = rowsOf(
        await manager.query(
          `select id from autonomy_policy_audits
             where product_id=$1 and idempotency_key=$2`,
          [productId, request.idempotencyKey],
        ),
      );
      if (existing.length > 0) {
        return current;
      }
      if (current.config.revision !== request.expectedRevision) {
        throw new ConflictException("Policy уже изменена, обновите экран");
      }

      const targetLevel: AutonomyLevel =
        request.action.type === "pause" ? "paused" : request.action.level;
      const nextConfig = {
        ...current.config,
        level: targetLevel,
        revision: current.config.revision + 1,
      };
      const nextMetrics = {
        ...current.metrics,
        manualHold: request.action.type === "pause" ? true : false,
        computedAt: new Date().toISOString(),
      };
      await manager.query(
        `update autonomy_policies
            set payload=$2, revision=$3, updated_at=now()
          where product_id=$1`,
        [productId, { config: nextConfig, metrics: nextMetrics }, nextConfig.revision],
      );
      await manager.query(
        `insert into autonomy_policy_audits
          (product_id, policy_id, actor_id, actor_role, action, from_level, to_level,
           reason, idempotency_key, metrics_before, metrics_after)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          productId,
          current.config.id,
          employee.id,
          employee.role,
          request.action.type,
          current.config.level,
          targetLevel,
          request.action.reason,
          request.idempotencyKey,
          current.metrics,
          nextMetrics,
        ],
      );
      return {
        config: autonomyConfigSchema.parse(nextConfig),
        metrics: autonomyMetricsSchema.parse(nextMetrics),
        eligibility: checkAutonomyEligibility(nextConfig, nextMetrics),
        case: null,
      };
    });
  }

  private async lockPolicy(
    manager: EntityManager,
    productId: ApiProductId,
  ): Promise<Row> {
    const rows = rowsOf(
      await manager.query(
        "select product_id, payload from autonomy_policies where product_id=$1 for update",
        [productId],
      ),
    );
    if (!rows[0]) {
      throw new NotFoundException("Политика автономности не найдена");
    }
    return rows[0];
  }

  private snapshotFromRow(
    row: Row | undefined,
    autonomyCase: ApiAutonomySnapshot["case"],
    productId: ApiProductId,
  ): ApiAutonomySnapshot {
    if (!row) {
      throw new ServiceUnavailableException(
        `Политика автономности не найдена для ${productId}; выполните db:seed`,
      );
    }
    const payload = row.payload as Record<string, unknown>;
    const config = autonomyConfigSchema.parse(payload.config);
    const metrics = autonomyMetricsSchema.parse(payload.metrics);
    const currentCase =
      autonomyCase?.disposition === "auto_offer_sent" &&
      autonomyCase.controlWindowEndsAt !== null &&
      new Date() >= new Date(autonomyCase.controlWindowEndsAt)
        ? { ...autonomyCase, disposition: "expired" as const }
        : autonomyCase;
    return {
      config,
      metrics,
      eligibility: checkAutonomyEligibility(config, metrics),
      case: currentCase,
    };
  }
}
