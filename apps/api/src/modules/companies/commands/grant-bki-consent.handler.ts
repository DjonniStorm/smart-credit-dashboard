import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";

import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import { CompanyProfileService } from "../company-profile.service.ts";
import { GrantBkiConsentCommand } from "./grant-bki-consent.command.ts";

@CommandHandler(GrantBkiConsentCommand)
export class GrantBkiConsentHandler implements ICommandHandler<GrantBkiConsentCommand> {
  constructor(private readonly profiles: CompanyProfileService) {}

  execute(command: GrantBkiConsentCommand): Promise<CompanyProfileResponse> {
    return this.profiles.grantBkiConsent(command.inn);
  }
}
