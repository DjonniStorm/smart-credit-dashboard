import { ForbiddenException, Injectable } from "@nestjs/common";

import type { ApiCreateApplication } from "@repo/contracts/api";

import { ApplicationsService } from "./applications.service.ts";

/** Чтение кабинета ограничено компанией сессии, независимо от параметров URL. */
@Injectable()
export class ClientApplicationsService {
  constructor(private readonly applications: ApplicationsService) {}

  async list(inn: string) {
    return this.applications.listApiApplications(inn);
  }

  async assertAccess(id: string, inn: string) {
    await this.applications.getApplication(id, inn);
  }

  async get(id: string, inn: string) {
    return this.applications.getApiApplication(id, inn);
  }

  async job(id: string, inn: string) {
    const job = await this.applications.getApiJob(id);
    await this.assertAccess(job.applicationId, inn);
    return job;
  }

  create(input: ApiCreateApplication, inn: string) {
    if (input.inn !== inn) {
      throw new ForbiddenException("Компания не совпадает с текущей сессией");
    }
    return this.applications.createApiApplication(input);
  }
}
