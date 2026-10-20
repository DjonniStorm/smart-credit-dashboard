import { createZodDto } from "nestjs-zod";

import { healthResponseSchema } from "@repo/contracts";

export class HealthDto extends createZodDto(healthResponseSchema) {}
