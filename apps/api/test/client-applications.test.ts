import assert from "node:assert/strict";
import test from "node:test";

import { NotFoundException } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants";

import {
  ApplicationsController,
  JobsController,
} from "../src/modules/applications/applications.controller.ts";
import { ApplicationsService } from "../src/modules/applications/applications.service.ts";
import { ClientApplicationsService } from "../src/modules/applications/client-applications.service.ts";
import { ClientSessionGuard } from "../src/modules/auth/client-session.guard.ts";
import { EmployeeSessionGuard } from "../src/modules/auth/employee-session.guard.ts";

function setup() {
  const state = { reads: 0, assertions: 0, writes: 0, lists: [] as string[] };
  const first = { id: "first", inn: "company-a" };
  const second = { id: "second", inn: "company-b" };
  const owned = (id: string, inn: string) => {
    const item = [first, second].find((app) => {
      return app.id === id && app.inn === inn;
    });
    if (!item) {
      throw new NotFoundException();
    }
    return item;
  };
  const applications = {
    listApiApplications: async (inn: string) => {
      state.lists.push(inn);
      return [first, second].filter((app) => {
        return app.inn === inn;
      });
    },
    getApplication: async (id: string, inn: string) => {
      state.assertions += 1;
      return owned(id, inn);
    },
    getApiApplication: async (id: string, inn: string) => {
      state.reads += 1;
      return owned(id, inn);
    },
    getApiJob: async () => {
      return { applicationId: "second" };
    },
    createApiApplication: async () => {
      state.writes += 1;
    },
  } as unknown as ApplicationsService;
  return {
    service: new ClientApplicationsService(applications),
    state,
    first,
    second,
  };
}

test("ИНН передаётся в запрос сервиса, а не фильтруется после общей выборки", async () => {
  const { service, state, first, second } = setup();
  assert.deepEqual(await service.list("company-a"), [first]);
  assert.deepEqual(await service.list("company-b"), [second]);
  assert.deepEqual(await service.list("missing"), []);
  assert.deepEqual(state.lists, ["company-a", "company-b", "missing"]);
});

test("карточка читается один раз с проверкой компании внутри чтения", async () => {
  const { service, state, first } = setup();
  assert.deepEqual(await service.get("first", "company-a"), first);
  assert.equal(state.reads, 1);
  assert.equal(state.assertions, 0);
  await assert.rejects(service.get("second", "company-a"), { status: 404 });
  await assert.rejects(service.job("job", "company-a"), { status: 404 });
});

test("создание заявки другой компании запрещено до записи", () => {
  const { service, state } = setup();
  assert.throws(
    () => service.create({ inn: "company-b" } as never, "company-a"),
    { status: 403 },
  );
  assert.equal(state.writes, 0);
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
