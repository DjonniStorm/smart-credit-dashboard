import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { DemoSession } from "@repo/contracts/api";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

import { WorkflowStore } from "./workflow-store.ts";

@Injectable()
export class ClientApplicationScopeService {
  constructor(private readonly store: WorkflowStore) {}

  owns(session: DemoSession, application: { inn: string }): boolean {
    return application.inn === session.account.company.inn;
  }

  async get(session: DemoSession, id: string): Promise<ApplicationWorkflow> {
    const application = await this.store.getApplication(id);
    if (!application) throw new NotFoundException("Заявка не найдена");
    if (!this.owns(session, application)) throw new ForbiddenException("Заявка принадлежит другой компании");
    return application;
  }

  async list(session: DemoSession): Promise<ApplicationWorkflow[]> {
    const applications = await this.store.listApplications();
    return applications.filter((application) => this.owns(session, application));
  }
}
