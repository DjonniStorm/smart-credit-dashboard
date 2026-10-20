import "server-only";

import { createClient, createConfig } from "@repo/sdk";

export const serverClient = createClient(
  createConfig({
    baseUrl: process.env.API_URL ?? "http://localhost:4000",
  }),
);
