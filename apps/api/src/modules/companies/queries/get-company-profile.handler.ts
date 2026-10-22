import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";

import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import { CompanyProfileService } from "../company-profile.service.ts";
import { GetCompanyProfileQuery } from "./get-company-profile.query.ts";

@QueryHandler(GetCompanyProfileQuery)
export class GetCompanyProfileHandler implements IQueryHandler<GetCompanyProfileQuery> {
  constructor(private readonly profiles: CompanyProfileService) {}

  execute(query: GetCompanyProfileQuery): Promise<CompanyProfileResponse> {
    return this.profiles.getProfile(query.inn);
  }
}
