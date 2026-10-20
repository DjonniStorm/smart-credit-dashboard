import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const pingExampleSchema = z.object({
  message: z.string().min(1),
});

export class PingExampleDto extends createZodDto(pingExampleSchema) {}
