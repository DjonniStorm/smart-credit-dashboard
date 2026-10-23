import { expect, test } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";
const clientBase = process.env.CLIENT_BASE_URL ?? "http://localhost:3000";
const backofficeBase = process.env.BACKOFFICE_BASE_URL ?? "http://localhost:3001";

async function waitForJob(request, jobId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await request.get(`${apiBase}/v1/jobs/${jobId}`);
    expect(response.ok()).toBeTruthy();
    const job = await response.json();
    if (["succeeded", "failed"].includes(job.status)) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Job ${jobId} did not finish in time`);
}

test("client and backoffice render the same scoring context", async ({
  request,
  page,
  browser,
}) => {
  const applicationId = "seed-app-bakery";
  const contextBefore = await request.get(
    `${apiBase}/v1/applications/${applicationId}/context`,
  );
  expect(contextBefore.ok()).toBeTruthy();
  const before = await contextBefore.json();

  if (!before.application.scoring) {
    const started = await request.post(
      `${apiBase}/v1/applications/${applicationId}/checks`,
      { data: { idempotencyKey: `e2e-context-${Date.now()}` } },
    );
    expect(started.status()).toBe(202);
    const job = await started.json();
    const finished = await waitForJob(request, job.id);
    expect(finished.status).toBe("succeeded");
  }

  const contextResponse = await request.get(
    `${apiBase}/v1/applications/${applicationId}/context`,
  );
  expect(contextResponse.ok()).toBeTruthy();
  const context = await contextResponse.json();
  expect(context.application.scoring).toBeTruthy();
  expect(context.autonomy.config.productId).toBe(
    context.application.productId,
  );
  const bki = context.checks.find((check) => check.source === "bki");
  expect(bki.state).toBe("pending");
  expect(bki.facts).toHaveLength(0);

  await page.goto(`${backofficeBase}/login`);
  await page.getByText("Аналитик Демо 1").click();
  await page.getByRole("button", { name: "Войти" }).click();
  await page.goto(`${backofficeBase}/applications/${applicationId}`);
  await expect(page.getByText("Кредитный риск")).toBeVisible();
  await expect(page.getByText("Автономность решения")).toBeVisible();
  await expect(
    page.getByText(String(context.application.scoring.score), { exact: false }),
  ).toBeVisible();

  const clientPage = await browser.newPage();
  await clientPage.goto(`${clientBase}/login`);
  await clientPage.getByRole("button", { name: /Анна Лесовая/i }).click();
  await clientPage.goto(`${clientBase}/applications/${applicationId}`);
  await expect(clientPage.getByText("Индексы компании")).toBeVisible();
  await expect(
    clientPage.getByText(String(context.application.scoring.healthIndex), {
      exact: true,
    }),
  ).toBeVisible();
  await clientPage.close();
});
