import assert from "node:assert/strict";
import test from "node:test";

import { GUARDS_METADATA } from "@nestjs/common/constants";

import {
  ApplicationsController,
  JobsController,
} from "../src/modules/applications/applications.controller.ts";
import { ApplicationsService } from "../src/modules/applications/applications.service.ts";
import { ClientApplicationsService } from "../src/modules/applications/client-applications.service.ts";
import { ClientSessionGuard } from "../src/modules/auth/client-session.guard.ts";
import { EmployeeSessionGuard } from "../src/modules/auth/employee-session.guard.ts";

const first = { id: "first", inn: "company-a" };
const second = { id: "second", inn: "company-b" };
const calls: string[] = [];
const applications = {
  listApiApplications: async () => [first, second],
  getApplication: async (id: string) => (id === "first" ? first : second),
  getApiApplication: async (id: string) => {
    calls.push(id);
    return first;
  },
  getApiJob: async () => ({ applicationId: "second" }),
  createApiApplication: async () => {
    calls.push("create");
  },
} as unknown as ApplicationsService;
const service = new ClientApplicationsService(applications);

test("список содержит только компанию текущего клиента", async () => {
  assert.deepEqual(await service.list("company-a"), [first]);
  assert.deepEqual(await service.list("company-b"), [second]);
  assert.deepEqual(await service.list("missing"), []);
});

test("чужая заявка и её задача не доступны даже по известному id", async () => {
  await assert.rejects(service.get("second", "company-a"), { status: 404 });
  await assert.rejects(service.job("job", "company-a"), { status: 404 });
  assert.equal(calls.includes("second"), false);
  assert.deepEqual(await service.get("first", "company-a"), first);
});

test("создание заявки другой компании запрещено до записи", () => {
  assert.throws(
    () => service.create({ inn: "company-b" } as never, "company-a"),
    { status: 403 },
  );
  assert.equal(calls.includes("create"), false);
});

test("клиентские чтения и команды защищены сессией, контекст только для сотрудника", () => {
  for (const method of ["list", "get", "create", "check"] as const) {
    assert.ok(
      Reflect.getMetadata(
        GUARDS_METADATA,
        ApplicationsController.prototype[method],
      ).includes(ClientSessionGuard),
    );
  }
  assert.ok(
    Reflect.getMetadata(GUARDS_METADATA, JobsController.prototype.get).includes(
      ClientSessionGuard,
    ),
  );
  assert.ok(
    Reflect.getMetadata(
      GUARDS_METADATA,
      ApplicationsController.prototype.context,
    ).includes(EmployeeSessionGuard),
  );
});
