import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default("postgres://alfa:alfa@localhost:5432/alfa"),
  SCORING_URL: z.string().default("http://localhost:8000"),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(1000),
  JOB_LEASE_MS: z.coerce.number().int().positive().default(60_000),
  STORAGE_ROOT: z.string().default("./.data/storage"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;
