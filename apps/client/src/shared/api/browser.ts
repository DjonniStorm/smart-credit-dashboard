"use client";

import { createClient, createConfig } from "@repo/sdk";

export const browserClient = createClient(
  createConfig({
    baseUrl: "/api",
    credentials: "include",
  }),
);
