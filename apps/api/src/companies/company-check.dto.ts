import {
  companyCheckResponseSchema,
  innParamSchema,
} from "@repo/contracts";
import { createZodDto } from "nestjs-zod";

export class InnParamDto extends createZodDto(innParamSchema) {}

export class CompanyCheckDto extends createZodDto(companyCheckResponseSchema) {}
