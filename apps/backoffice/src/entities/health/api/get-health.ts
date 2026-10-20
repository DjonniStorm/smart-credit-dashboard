import "server-only";

import { type HealthDto, healthControllerCheck } from "@repo/sdk";

import { serverClient } from "@/shared/api/server";

export async function getHealth(): Promise<HealthDto> {
  const { data } = await healthControllerCheck({
    client: serverClient,
    throwOnError: true,
  });
  if (!data) {
    throw new Error("empty health");
  }
  return data;
}
