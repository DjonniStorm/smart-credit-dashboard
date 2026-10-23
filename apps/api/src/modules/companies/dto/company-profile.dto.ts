import { createZodDto } from "nestjs-zod";

import {
  bkiConsentRequestSchema,
  companyProfileResponseSchema,
} from "@repo/contracts/company-profile";

export class CompanyProfileDto extends createZodDto(
  companyProfileResponseSchema,
) {}

export class BkiConsentDto extends createZodDto(bkiConsentRequestSchema) {}
