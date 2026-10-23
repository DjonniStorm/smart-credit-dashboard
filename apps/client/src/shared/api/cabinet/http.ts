import { z } from "zod";

import {
  apiApplicationResponseSchema,
  apiApplicationSchema,
  apiProductCatalogSchema,
  demoAccountApiSchema,
  demoSessionSchema,
} from "@repo/contracts/api";
import {
  type ClientAction,
  clientActionResponseSchema,
} from "@repo/contracts/client-actions";
import { companyProfileResponseSchema } from "@repo/contracts/company-profile";

import {
  toCabinetApplication,
  toCompanyProfile,
  toProductCatalog,
} from "./api-mapper";
import { ApiError, type CabinetApi } from "./types";

// HTTP-адаптер к ручкам API; ответы проверяются схемами из contracts.

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
  if (res.status === 204) {
    return undefined as T;
  }
  return schema.parse(await res.json());
}

const post = { method: "POST" } as const;

export const httpApi: CabinetApi = {
  listDemoAccounts: () =>
    call(z.array(demoAccountApiSchema), "/v1/auth/demo-accounts"),
  currentAccount: () =>
    call(demoSessionSchema, "/v1/auth/me")
      .then((session) => session.account)
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          return null;
        }
        throw e;
      }),
  signIn: (accountId) =>
    call(demoAccountApiSchema, "/v1/auth/demo-sign-in", {
      ...post,
      json: { accountId },
    }),
  signOut: () =>
    call(z.unknown(), "/v1/auth/sign-out", post).then(() => undefined),

  getCatalog: () =>
    call(apiProductCatalogSchema, "/v1/products").then(toProductCatalog),
  getCompanyProfile: (inn) =>
    call(companyProfileResponseSchema, `/v1/companies/${inn}/profile`),
  grantBkiConsent: (inn) =>
    call(companyProfileResponseSchema, `/v1/companies/${inn}/consents/bki`, {
      ...post,
      json: { granted: true },
    }),
  lookupCompany: (inn) =>
    call(companyProfileResponseSchema, `/v1/companies/${inn}/profile`).then(
      toCompanyProfile,
    ),

  listApplications: async () => {
    const [applications, session] = await Promise.all([
      call(z.array(apiApplicationSchema), "/v1/applications"),
      currentSession(),
    ]);
    return applications.map((application) =>
      toCabinetApplication(application, session),
    );
  },
  getApplication: async (id) => {
    const [application, session] = await Promise.all([
      call(apiApplicationSchema, `/v1/applications/${id}`),
      currentSession(),
    ]);
    return toCabinetApplication(application, session);
  },
  createApplication: async (input) => {
    const session = await currentSession();
    const response = await call(
      apiApplicationResponseSchema,
      "/v1/applications",
      {
        ...post,
        json: {
          inn: session.account.company.inn,
          productId: input.productId,
          amount: input.amount,
          termMonths: input.termMonths,
          purpose: input.purpose,
          idempotencyKey: makeIdempotencyKey(),
        },
      },
    );
    return toCabinetApplication(response.application, session);
  },
  answerRequest: (id, _requestId, answer, key) =>
    clientAction(id, { type: "answer_request", answer }, key),
  acceptOffer: (id, key) => clientAction(id, { type: "accept_offer" }, key),
  declineOffer: (id, key) => clientAction(id, { type: "decline_offer" }, key),
  requestSignCode: async (id, key) => {
    const response = await sendClientAction(
      id,
      { type: "request_sign_code" },
      key,
    );
    return { demoCode: response.demoCode ?? "" };
  },
  sign: (id, code, key) => clientAction(id, { type: "sign", code }, key),
};

function sendClientAction(
  id: string,
  action: ClientAction,
  idempotencyKey: string,
) {
  return call(
    clientActionResponseSchema,
    `/v1/applications/${id}/client-actions`,
    { ...post, json: { action, idempotencyKey } },
  );
}

/** Команда клиента; ответ уже содержит обновлённую заявку. */
async function clientAction(
  id: string,
  action: ClientAction,
  idempotencyKey: string,
) {
  const [response, session] = await Promise.all([
    sendClientAction(id, action, idempotencyKey),
    currentSession(),
  ]);
  return toCabinetApplication(response.application, session);
}

async function currentSession() {
  return call(demoSessionSchema, "/v1/auth/me");
}

function makeIdempotencyKey(): string {
  return `client-${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random()}`;
}
