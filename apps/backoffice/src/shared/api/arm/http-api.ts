"use client";

import {
  type Application,
  type CreditProduct,
  type Employee,
  applicationSchema,
  creditProductSchema,
  employeeSchema,
} from "@repo/contracts/application";

import type { ArmApi } from "./types";

// Пути ручек согласовать с api. /api проксируется в Nest (next.config.js).
const BASE = "/api/arm";

async function request<T>(
  path: string,
  schema: { parse(value: unknown): T },
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
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

const post = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});

export const httpArmApi: ArmApi = {
  listApplications: () =>
    request<Application[]>("/applications", applicationSchema.array()),
  getApplication: (id) =>
    request<Application>(`/applications/${id}`, applicationSchema),
  act: (id, action, employeeId) =>
    request<Application>(
      `/applications/${id}/actions`,
      applicationSchema,
      post({ action, employeeId }),
    ),
  simulateClient: () =>
    Promise.reject(
      new Error("Ответ клиента приходит из кабинета клиента, а не из АРМ"),
    ),
  listProducts: () =>
    request<CreditProduct[]>("/products", creditProductSchema.array()),
  listEmployees: () =>
    request<Employee[]>("/employees", employeeSchema.array()),
  reset: () => Promise.resolve(),
};
