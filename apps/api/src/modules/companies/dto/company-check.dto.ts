import { createZodDto } from "nestjs-zod";

import { companyCheckResponseSchema, innParamSchema } from "@repo/contracts";

export class InnParamDto extends createZodDto(innParamSchema) {}

export class CompanyCheckDto extends createZodDto(companyCheckResponseSchema) {}
