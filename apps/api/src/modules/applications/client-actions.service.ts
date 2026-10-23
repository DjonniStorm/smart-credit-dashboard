import { Injectable, NotFoundException } from "@nestjs/common";

import type { DemoSession } from "@repo/contracts/api";
import type {
  ClientActionRequest,
  ClientActionResponse,
} from "@repo/contracts/client-actions";

import { ApplicationsService } from "./applications.service.ts";
import {
  demoSignCode,
  prepareContract,
  runClientCommand,
} from "./client-commands.ts";
import { WorkflowStore } from "./workflow-store.ts";

/** Команды клиента над своей заявкой: переход, запись и аудит в одной транзакции. */
@Injectable()
export class ClientActionsService {
  constructor(
    private readonly store: WorkflowStore,
    private readonly applications: ApplicationsService,
  ) {}

  async execute(
    applicationId: string,
    request: ClientActionRequest,
    session: DemoSession,
  ): Promise<ClientActionResponse> {
    await this.store.inTransaction(async (tx) => {
      const current = await tx.lockApplication(applicationId);
      // Чужая заявка выглядит так же, как несуществующая: номер не подтверждается.
      if (!current || current.inn !== session.account.company.inn) {
        throw new NotFoundException("Заявка не найдена");
      }
      // Тип действия входит в scope: один ключ не может случайно подтвердить другое действие.
      const scope = `client-action:${applicationId}:${request.action.type}`;
      if (await tx.findIdempotent(scope, request.idempotencyKey)) {
        return;
      }

      const outcome = runClientCommand(
        current,
        request.action,
        new Date().toISOString(),
      );
      await tx.saveManagement(outcome.application);
      const eventId = await tx.appendEvent(applicationId, outcome.event.kind, {
        ...outcome.event.metadata,
        title: outcome.event.title,
        comment: outcome.event.comment,
        actorKind: "client",
        actorName: session.account.person,
      });
      await tx.remember(scope, request.idempotencyKey, eventId);
    });

    return {
      application: await this.applications.getApiApplication(applicationId),
      demoCode:
        request.action.type === "request_sign_code"
          ? demoSignCode(applicationId)
          : null,
    };
  }

  /**
   * Системный шаг plan.md ACCEPTED → SIGNING: воркер готовит договоры по принятым
   * предложениям на каждом проходе очереди.
   */
  async prepareContracts(): Promise<number> {
    return this.store.inTransaction(async (tx) => {
      const accepted = await tx.lockAcceptedApplications();
      for (const current of accepted) {
        const outcome = prepareContract(current, new Date().toISOString());
        await tx.saveManagement(outcome.application);
        await tx.appendEvent(current.id, outcome.event.kind, {
          ...outcome.event.metadata,
          title: outcome.event.title,
          comment: outcome.event.comment,
          actorKind: "system",
          actorName: "Кредитный конвейер",
        });
      }
      return accepted.length;
    });
  }
}
