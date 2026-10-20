import { healthResponseSchema } from "@repo/contracts";
import { createZodDto } from "nestjs-zod";

export class HealthDto extends createZodDto(healthResponseSchema) {}
