import { Module } from "@nestjs/common";

import { GrantBkiConsentHandler } from "./commands/grant-bki-consent.handler.ts";
import { CompaniesController } from "./companies.controller.ts";
import { CompaniesService } from "./companies.service.ts";
import { CompanyConsentStore } from "./company-consent.store.ts";
import { CompanyProfileService } from "./company-profile.service.ts";
import { CheckCompanyHandler } from "./queries/check-company.handler.ts";
import { GetCompanyProfileHandler } from "./queries/get-company-profile.handler.ts";

@Module({
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    CompanyProfileService,
    CompanyConsentStore,
    CheckCompanyHandler,
    GetCompanyProfileHandler,
    GrantBkiConsentHandler,
  ],
  exports: [CompaniesService],
})
export class CompaniesModule {}
