import { expect, test } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";

test.describe("workflow API without mocks", () => {
  test("creates an application, starts an idempotent check and reaches a terminal job", async ({ request }) => {
    const idempotencyKey = `e2e-${Date.now()}-create`;
    const payload = {
      inn: "0012345012",
      productId: "working_capital",
      amount: 1_800_000,
      termMonths: 18,
      purpose: "Пополнение оборотных средств",
      idempotencyKey,
    };

    const created = await request.post(`${apiBase}/v1/applications`, { data: payload });
    expect(created.ok()).toBeTruthy();
    const first = await created.json();
    expect(first.application.id).toMatch(/^app-/);
    expect(first.checkJob.id).toMatch(/^job-/);

    const replay = await request.post(`${apiBase}/v1/applications`, { data: payload });
    expect(replay.ok()).toBeTruthy();
    expect((await replay.json()).application.id).toBe(first.application.id);

    const checkKey = `e2e-${Date.now()}-check`;
    const started = await request.post(`${apiBase}/v1/applications/${first.application.id}/checks`, {
      data: { idempotencyKey: checkKey },
    });
    expect(started.status()).toBe(202);
    const job = await started.json();

    let terminal;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await request.get(`${apiBase}/v1/jobs/${job.id}`);
      expect(response.ok()).toBeTruthy();
      terminal = await response.json();
      if (["succeeded", "failed"].includes(terminal.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    expect(["succeeded", "failed"]).toContain(terminal.status);
  });

  test("applies a request-info command idempotently and records the audit event", async ({ request }) => {
    const application = await request.post(`${apiBase}/v1/applications`, {
      data: {
        inn: "0012345012",
        productId: "working_capital",
        amount: 1_200_000,
        termMonths: 12,
        purpose: "Проверка запроса менеджера",
        idempotencyKey: `e2e-${Date.now()}-action-create`,
      },
    });
    expect(application.ok()).toBeTruthy();
    const created = await application.json();
    const action = {
      action: {
        type: "request_info",
        items: ["Выписка по расчётному счёту за 6 месяцев"],
        comment: "Нужна выписка для уточнения оборотов",
      },
      employeeId: "employee-analyst",
      idempotencyKey: `e2e-${Date.now()}-request-info`,
    };

    const first = await request.post(`${apiBase}/v1/applications/${created.application.id}/actions`, {
      data: action,
    });
    expect(first.ok()).toBeTruthy();
    const context = await first.json();
    expect(context.application.status).toBe("NEEDS_INFO");
    expect(context.application.requestedInfo).toEqual(action.action.items);
    expect(context.audit.some((event) => event.kind === "application_action")).toBeTruthy();

    const replay = await request.post(`${apiBase}/v1/applications/${created.application.id}/actions`, {
      data: action,
    });
    expect(replay.ok()).toBeTruthy();
    expect((await replay.json()).application.status).toBe("NEEDS_INFO");
  });
});
