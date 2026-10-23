import { Injectable, NotFoundException } from "@nestjs/common";

import type { ApiApplicationContext } from "@repo/contracts/api";
import type { Employee } from "@repo/contracts/application";
import type { ApplicationActionRequest } from "@repo/contracts/workflow";

import { DemoDataStore } from "../../common/demo-data/demo-data.store.ts";
import { CatalogService } from "../catalog/catalog.service.ts";
import { runCommand } from "./application-commands.ts";
import { ApplicationsService } from "./applications.service.ts";
import { WorkflowStore } from "./workflow-store.ts";

/** Команды сотрудника АРМ над заявкой: проверка перехода, запись и аудит в одной транзакции. */
@Injectable()
export class ApplicationActionsService {
  constructor(
    private readonly store: WorkflowStore,
    private readonly catalog: CatalogService,
    private readonly data: DemoDataStore,
    private readonly applications: ApplicationsService,
  ) {}

  async execute(
    applicationId: string,
    request: ApplicationActionRequest,
    employee: Employee,
  ): Promise<ApiApplicationContext> {
    const employeeIds = new Set(
      (await this.data.listEmployees()).map((item) => item.id),
    );
    const catalog = this.catalog.getCatalog();

    await this.store.inTransaction(async (tx) => {
      const current = await tx.lockApplication(applicationId);
      if (!current) {
        throw new NotFoundException("Заявка не найдена");
      }
      const scope = `action:${applicationId}`;
      if (await tx.findIdempotent(scope, request.idempotencyKey)) {
        return;
      }

      const now = new Date().toISOString();
      const outcome = runCommand(current, request.action, {
        employee,
        now,
        catalog,
        employeeIds,
      });
      if (outcome.recheck) {
        outcome.application.checkJobId = await tx.queueRecheck(
          applicationId,
          request.idempotencyKey,
        );
      }
      await tx.saveManagement(outcome.application);
      if (outcome.comment) {
        await tx.addComment(outcome.comment);
      }
      const eventId = await tx.appendEvent(applicationId, outcome.event.kind, {
        ...outcome.event.metadata,
        title: outcome.event.title,
        comment: outcome.event.comment,
        actorKind: "employee",
        actorName: employee.name,
      });
      await tx.remember(scope, request.idempotencyKey, eventId);
    });

    return this.applications.getApiApplicationContext(applicationId);
  }
}
