"use client";

import {
  type ApiApplicationContext,
  type ApiAutonomyAudit,
  type ApiAutonomySnapshot,
  type ApiProductCatalog,
  type ApiQueueItem,
  apiApplicationContextSchema,
  apiAutonomyAuditSchema,
  apiAutonomySnapshotSchema,
  apiProductCatalogSchema,
  apiQueueItemSchema,
  autonomyPolicyActionRequestSchema,
} from "@repo/contracts/api";
import { type Employee, employeeSchema } from "@repo/contracts/application";
import {
  type CompanyProfileResponse,
  companyProfileResponseSchema,
} from "@repo/contracts/company-profile";
import { managerReportResponseSchema } from "@repo/contracts/reports";

import {
  toArmApplication,
  toArmApplicationContext,
  toArmProducts,
  toEmployees,
} from "./api-mapper";
import type { ArmApi } from "./types";

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
    const items = await request<ApiQueueItem[]>(
      "/applications/queue",
      apiQueueItemSchema.array(),
    );
    return items.map((item) => toArmApplication(item));
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
  act: async (id, action) => {
    const context = await request<ApiApplicationContext>(
      `/applications/${id}/actions`,
      apiApplicationContextSchema,
      {
        method: "POST",
        body: JSON.stringify({ action, idempotencyKey: crypto.randomUUID() }),
      },
    );
    return toArmApplicationContext(context);
  },
  simulateClient: async () => {
    throw new Error("Ответ клиента приходит из кабинета клиента");
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
  signInEmployee: (employeeId) =>
    request<Employee>("/auth/employee-sign-in", employeeSchema, {
      method: "POST",
      body: JSON.stringify({ employeeId }),
    }),
  signOutEmployee: async () => {
    await fetch(`${BASE}/auth/employee-sign-out`, {
      method: "POST",
      credentials: "include",
    });
  },
  currentEmployee: async () => {
    const res = await fetch(`${BASE}/auth/employee-me`, {
      credentials: "include",
    });
    if (res.status === 401) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Сервер ответил ${res.status}`);
    }
    return employeeSchema.parse(await res.json());
  },
  reset: async () => {
    throw new Error("Сброс демо-данных выполняется командой db:seed");
  },
  listAutonomyPolicies: () =>
    request<ApiAutonomySnapshot[]>(
      "/autonomy/policies",
      apiAutonomySnapshotSchema.array(),
    ),
  getAutonomyPolicy: (productId) =>
    request<ApiAutonomySnapshot>(
      `/autonomy/policies/${productId}`,
      apiAutonomySnapshotSchema,
    ),
  listAutonomyAudit: (productId) =>
    request<ApiAutonomyAudit[]>(
      `/autonomy/policies/${productId}/audit`,
      apiAutonomyAuditSchema.array(),
    ),
  applyAutonomyPolicyAction: (productId, body) => {
    const parsedBody = autonomyPolicyActionRequestSchema.parse(body);
    return request<ApiAutonomySnapshot>(
      `/autonomy/policies/${productId}/actions`,
      apiAutonomySnapshotSchema,
      {
        method: "POST",
        body: JSON.stringify(parsedBody),
      },
    );
  },
  getManagerReport: (query) => {
    const params = new URLSearchParams();
    if (query?.view) {
      params.set("view", query.view);
    }
    if (query?.cursor) {
      params.set("cursor", query.cursor);
    }
    if (query?.actor) {
      params.set("actor", query.actor);
    }
    if (query?.limit) {
      params.set("limit", String(query.limit));
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<import("@repo/contracts/reports").ManagerReportResponse>(
      `/reports/manager${suffix}`,
      managerReportResponseSchema,
    );
  },
};
