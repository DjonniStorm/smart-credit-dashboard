import "server-only";

import { type CompanyCheckDto, companiesControllerCheck } from "@repo/sdk";

import { serverClient } from "@/shared/api/server";

export async function getCompanyCheck(inn: string): Promise<CompanyCheckDto> {
  const { data } = await companiesControllerCheck({
    client: serverClient,
    path: { inn },
    throwOnError: true,
  });
  if (!data) {
    throw new Error("empty company check");
  }
  return data;
}
