import assert from "node:assert/strict";
import test from "node:test";

import {
  applicationCommandSchema,
  applicationCommentSchema,
  applicationEventSchema,
  applicationHandoffSchema,
  employeeActionSchema,
} from "../src/application.ts";

test("accepts the command set used by the bank workflow", () => {
  const commands = [
    { type: "comment", visibility: "internal", body: "Нужна проверка выписки" },
    {
      type: "handoff",
      assigneeId: "employee-2",
      summary: "Передать на решение",
      verifiedFacts: ["ЕГРЮЛ действует"],
      openQuestions: [],
      requestedItems: [],
      nextStep: "Проверить лимит сотрудника",
    },
    { type: "cancel", reason: "Клиент отозвал заявку" },
    { type: "set_urgent", enabled: true },
  ];

  for (const command of commands) {
    assert.equal(employeeActionSchema.safeParse(command).success, true);
    assert.equal(applicationCommandSchema.safeParse(command).success, true);
  }
});

test("keeps old audit events valid and accepts structured audit metadata", () => {
  const base = {
    id: "event-1",
    applicationId: "app-1",
    at: "2026-10-23T10:00:00.000Z",
    actor: { id: "employee-1", name: "Иван", role: "analyst" },
    title: "Заявка принята",
    comment: null,
    fromStatus: null,
    toStatus: "submitted",
  };

  assert.equal(applicationEventSchema.safeParse(base).success, true);
  assert.equal(
    applicationEventSchema.safeParse({
      ...base,
      kind: "handoff",
      metadata: { assigneeId: "employee-2", visibility: "internal" },
    }).success,
    true,
  );
});

test("requires a meaningful comment and handoff next step", () => {
  assert.equal(
    applicationCommentSchema.safeParse({
      id: "comment-1",
      applicationId: "app-1",
      at: "2026-10-23T10:00:00.000Z",
      author: { id: "employee-1", name: "Иван", role: "analyst" },
      visibility: "client",
      body: "Документы получены",
    }).success,
    true,
  );
  assert.equal(
    applicationHandoffSchema.safeParse({
      id: "handoff-1",
      applicationId: "app-1",
      at: "2026-10-23T10:00:00.000Z",
      from: { id: "employee-1", name: "Иван", role: "analyst" },
      toEmployeeId: "employee-2",
      summary: "Передача",
      verifiedFacts: [],
      openQuestions: [],
      requestedItems: [],
      nextStep: "Проверить заявку",
    }).success,
    true,
  );
  assert.equal(
    employeeActionSchema.safeParse({
      type: "comment",
      visibility: "internal",
      body: "",
    }).success,
    false,
  );
});
