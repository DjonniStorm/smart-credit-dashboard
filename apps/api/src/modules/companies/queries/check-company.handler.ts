import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";

import type { CompanyCheckResponse } from "@repo/contracts";

import { CompaniesService } from "../companies.service.ts";
import { CheckCompanyQuery } from "./check-company.query.ts";

@QueryHandler(CheckCompanyQuery)
export class CheckCompanyHandler implements IQueryHandler<CheckCompanyQuery> {
  constructor(private readonly companies: CompaniesService) {}

  execute(query: CheckCompanyQuery): Promise<CompanyCheckResponse> {
    return this.companies.check(query.inn);
  }
}
