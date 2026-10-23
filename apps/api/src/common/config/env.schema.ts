import { z } from "zod";

import { DEFAULT_KEY_RATE } from "@repo/contracts/product-catalog";

export const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default("postgres://alfa:alfa@localhost:5432/alfa"),
  SCORING_URL: z.string().default("http://localhost:8000"),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(1000),
  STORAGE_ROOT: z.string().default("./.data/storage"),
  KEY_RATE_PERCENT: z.coerce
    .number()
    .positive()
    .default(DEFAULT_KEY_RATE.value),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;
