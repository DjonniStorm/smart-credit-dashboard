import { z } from "zod";

import {
  applicationSchema,
  companyProfileSchema,
  demoAccountSchema,
  productCatalogSchema,
} from "@repo/contracts/cabinet";
import { companyProfileResponseSchema } from "@repo/contracts/company-profile";

import { ApiError, type CabinetApi } from "./types";

// HTTP-адаптер к ручкам API; ответы проверяются схемами из contracts.
// В index.ts можно переключить его на mock-адаптер для локального сценария.

async function call<T>(
  schema: z.ZodType<T>,
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: init?.json ? { "Content-Type": "application/json" } : undefined,
    body: init?.json ? JSON.stringify(init.json) : init?.body,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiError(body?.message ?? res.statusText, res.status);
  }
  return schema.parse(await res.json());
}

const post = { method: "POST" } as const;

export const httpApi: CabinetApi = {
  listDemoAccounts: () =>
    call(z.array(demoAccountSchema), "/auth/demo-accounts"),
  currentAccount: () =>
    call(demoAccountSchema, "/auth/me").catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }),
  signIn: (accountId) =>
    call(demoAccountSchema, "/auth/demo-sign-in", {
      ...post,
      json: { accountId },
    }),
  signOut: () =>
    call(z.unknown(), "/auth/sign-out", post).then(() => undefined),

  getCatalog: () => call(productCatalogSchema, "/products"),
  getCompanyProfile: (inn) =>
    call(companyProfileResponseSchema, `/v1/companies/${inn}/profile`),
  grantBkiConsent: (inn) =>
    call(companyProfileResponseSchema, `/v1/companies/${inn}/consents/bki`, {
      ...post,
      json: { granted: true },
    }),
  lookupCompany: (inn) => call(companyProfileSchema, `/companies/${inn}/egrul`),

  listApplications: () => call(z.array(applicationSchema), "/applications"),
  getApplication: (id) => call(applicationSchema, `/applications/${id}`),
  createApplication: (input) =>
    call(applicationSchema, "/applications", { ...post, json: input }),
  answerRequest: (id, requestId, answer) =>
    call(
      applicationSchema,
      `/applications/${id}/requests/${requestId}/answer`,
      {
        ...post,
        json: answer,
      },
    ),
  acceptOffer: (id) =>
    call(applicationSchema, `/applications/${id}/offer/accept`, post),
  declineOffer: (id) =>
    call(applicationSchema, `/applications/${id}/offer/decline`, post),
  requestSignCode: (id) =>
    call(
      z.object({ demoCode: z.string() }),
      `/applications/${id}/sign/code`,
      post,
    ),
  sign: (id, code) =>
    call(applicationSchema, `/applications/${id}/sign`, {
      ...post,
      json: { code },
    }),
};
