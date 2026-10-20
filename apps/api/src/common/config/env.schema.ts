import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default("postgres://alfa:alfa@localhost:5432/alfa"),
  SCORING_URL: z.string().default("http://localhost:8000"),
  MOCKS_URL: z.string().default("http://localhost:4100"),
});

export type Env = z.infer<typeof envSchema>;
