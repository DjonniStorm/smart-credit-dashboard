import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";

test("запрос банка, ответ, встречное предложение и подпись доходят до FUNDED", async ({
  playwright,
}) => {
  test.setTimeout(90_000);
  const client = await playwright.request.newContext({ baseURL: apiBase });
  const bank = await playwright.request.newContext({ baseURL: apiBase });
  const call = async (context, path, body) => {
    const response = body
      ? await context.post(path, { data: body })
      : await context.get(path);
    expect(response.ok(), await response.text()).toBeTruthy();
    return response.json();
  };
  try {
    await call(client, "/v1/auth/demo-sign-in", { accountId: "bakery" });
    const employees = await call(bank, "/v1/employees");
    const lead = employees.find((employee) => {
      return employee.role === "lead";
    });
    expect(lead).toBeTruthy();
    await call(bank, "/v1/auth/employee-sign-in", { employeeId: lead.id });
    await call(client, "/v1/companies/9901000017/consents/bki", {
      granted: true,
    });
    const created = await call(client, "/v1/applications", {
      inn: "9901000017",
      productId: "working_capital",
      purpose: "working_capital",
      amount: 500_000,
      termMonths: 12,
      idempotencyKey: randomUUID(),
    });
    const path = "/v1/applications/" + created.application.id;
    const employee = (action) => {
      return call(bank, path + "/actions", {
        action,
        idempotencyKey: randomUUID(),
      });
    };
    const customer = (action) => {
      return call(client, path + "/client-actions", {
        action,
        idempotencyKey: randomUUID(),
      });
    };
    if ((await call(client, path)).status !== "NEEDS_INFO") {
      await employee({
        type: "request_info",
        items: ["Выписка за период проверки"],
        comment: "Проверка сквозного сценария",
      });
    }
    expect((await call(client, path)).status).toBe("NEEDS_INFO");
    const answered = await customer({
      type: "answer_request",
      answer: { text: "Пояснение для тестового сценария", documents: [] },
    });
    expect(answered.application.status).toBe("UNDER_REVIEW");
    // Решение доступно сотруднику только после завершения скоринга.
    await expect
      .poll(
        async () => {
          return (await call(bank, path + "/context")).management.waitingOn;
        },
        { timeout: 30_000 },
      )
      .toBe("employee");
    await employee({
      type: "counter_offer",
      terms: {
        productId: "working_capital",
        amount: 400_000,
        termMonths: 12,
        ratePct: 19,
      },
      comment: "Проверка встречного предложения",
    });
    expect((await call(client, path)).status).toBe("OFFERED");
    expect((await customer({ type: "accept_offer" })).application.status).toBe(
      "ACCEPTED",
    );
    await expect
      .poll(
        async () => {
          return (await call(client, path)).status;
        },
        { timeout: 20_000 },
      )
      .toBe("SIGNING");
    const code = await customer({ type: "request_sign_code" });
    expect(code.demoCode).toMatch(/^\d{6}$/);
    const funded = (await customer({ type: "sign", code: code.demoCode }))
      .application;
    expect(funded.status).toBe("FUNDED");
    expect(funded.deal.signedAt).toBeTruthy();
    expect(funded.deal.disbursedAt).toBeTruthy();
  } finally {
    await client.dispose();
    await bank.dispose();
  }
});
