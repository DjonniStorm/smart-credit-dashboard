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
});
