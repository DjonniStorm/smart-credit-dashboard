import assert from "node:assert/strict";
import test from "node:test";

import type { ExecutionContext } from "@nestjs/common";
import { ZodValidationPipe } from "nestjs-zod";

import { ClientActionDto } from "../src/modules/applications/applications.controller.ts";
import { AuthService } from "../src/modules/auth/auth.service.ts";
import { ClientSessionGuard } from "../src/modules/auth/client-session.guard.ts";

// HTTP-слой ручки команд клиента без базы: guard сессии и проверка тела схемой.

function contextWith(cookie?: string): ExecutionContext {
  const request = { headers: cookie ? { cookie } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const auth = new AuthService({
  getSession: async () => null,
} as never);

test("без cookie сессии клиента guard отвечает 401", async () => {
  await assert.rejects(
    new ClientSessionGuard(auth).canActivate(contextWith()),
    { status: 401 },
  );
});

test("с истёкшей сессией guard отвечает 401", async () => {
  await assert.rejects(
    new ClientSessionGuard(auth).canActivate(
      contextWith("alfa_demo_session=missing"),
    ),
    { status: 401 },
  );
});

test("тело команды без ключа или с кривым кодом даёт 400", () => {
  const pipe = new ZodValidationPipe();
  const metadata = { type: "body", metatype: ClientActionDto } as const;
  for (const body of [
    { action: { type: "accept_offer" } },
    { action: { type: "sign", code: "12" }, idempotencyKey: "key-12345678" },
    { action: { type: "fly_away" }, idempotencyKey: "key-12345678" },
  ]) {
    assert.throws(() => pipe.transform(body, metadata), { status: 400 });
  }
  assert.deepEqual(
    pipe.transform(
      { action: { type: "accept_offer" }, idempotencyKey: "key-12345678" },
      metadata,
    ),
    { action: { type: "accept_offer" }, idempotencyKey: "key-12345678" },
  );
});
