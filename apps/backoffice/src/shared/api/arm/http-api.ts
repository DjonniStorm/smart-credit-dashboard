"use client";

import {
  apiApplicationSchema,
  apiApplicationContextSchema,
  apiProductCatalogSchema,
  type ApiApplication,
  type ApiApplicationContext,
  type ApiProductCatalog,
} from "@repo/contracts/api";
import {
  type Employee,
  employeeSchema,
} from "@repo/contracts/application";
import {
  companyProfileResponseSchema,
  type CompanyProfileResponse,
} from "@repo/contracts/company-profile";

import type { ArmApi } from "./types";
import {
  toArmApplication,
  toArmApplicationContext,
  toArmProducts,
  toEmployees,
} from "./api-mapper";

// Пути ручек согласовать с api. /api проксируется в Nest (next.config.js).
const BASE = "/api/v1";

async function request<T>(
  path: string,
  schema: { parse(value: unknown): T },
  init?: RequestInit,
  base = BASE,
): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Сервер ответил ${res.status}`);
  }
  return schema.parse(await res.json());
}

export const httpArmApi: ArmApi = {
  listApplications: async () => {
    const applications = await request<ApiApplication[]>(
      "/applications",
      apiApplicationSchema.array(),
    );
    return applications.map((application) => toArmApplication(application));
  },
  getApplication: async (id) => {
    const context = await request<ApiApplicationContext>(
      `/applications/${id}/context`,
      apiApplicationContextSchema,
    );
    return toArmApplicationContext(context);
  },
  getCompanyProfile: (inn) =>
    request<CompanyProfileResponse>(
      `/v1/companies/${inn}/profile`,
      companyProfileResponseSchema,
      undefined,
      "/api",
    ),
  act: async (id, action, employeeId) => {
    const context = await request<ApiApplicationContext>(
      `/applications/${id}/actions`,
      apiApplicationContextSchema,
      {
        method: "POST",
        body: JSON.stringify({
          action,
          employeeId,
          idempotencyKey: `arm-${crypto.randomUUID()}`,
        }),
      },
    );
    return toArmApplicationContext(context);
  },
  simulateClient: async () => {
    throw new Error("Ответы клиента появятся после подключения команд API");
  },
  listProducts: async () => {
    const catalog = await request<ApiProductCatalog>(
      "/products",
      apiProductCatalogSchema,
    );
    return toArmProducts(catalog);
  },
  listEmployees: () =>
    request<Employee[]>("/employees", employeeSchema.array()).then(toEmployees),
  reset: async () => {
    throw new Error("Сброс демо-данных выполняется командой db:seed");
  },
};
