import { expect, test } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";
const clientBase = process.env.CLIENT_BASE_URL ?? "http://localhost:3000";
const backofficeBase =
  process.env.BACKOFFICE_BASE_URL ?? "http://localhost:3001";

async function waitForJob(request, jobId) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await request.get(`${apiBase}/v1/jobs/${jobId}`);
    expect(response.ok()).toBeTruthy();
    const job = await response.json();
    if (["succeeded", "failed"].includes(job.status)) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Задача ${jobId} не завершилась вовремя`);
}

test("сотрудник одобряет заявку в АРМ, клиент видит решение", async ({
  request,
  page,
  browser,
}) => {
  const created = await request.post(`${apiBase}/v1/applications`, {
    data: {
      inn: "9901000017",
      productId: "working_capital",
      amount: 1_200_000,
      termMonths: 12,
      purpose: "working_capital",
      idempotencyKey: `e2e-arm-${Date.now()}`,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { application, checkJob } = await created.json();
  expect((await waitForJob(request, checkJob.id)).status).toBe("succeeded");

  // Без сессии сотрудника команды закрыты.
  const anonymous = await request.post(
    `${apiBase}/v1/applications/${application.id}/actions`,
    {
      data: {
        action: { type: "approve", comment: "" },
        idempotencyKey: `e2e-anon-${Date.now()}`,
      },
    },
  );
  expect(anonymous.status()).toBe(401);

  await page.goto(`${backofficeBase}/login`);
  await page.getByText("Аналитик Демо 1").click();
  await page.getByRole("button", { name: "Войти" }).click();
  await page.goto(`${backofficeBase}/applications/${application.id}`);

  const approveButton = page.getByRole("button", {
    name: "Одобрить",
    exact: true,
  });
  if (!(await approveButton.isVisible())) {
    await page.getByRole("button", { name: "Другие действия" }).click();
    await page.getByRole("menuitem", { name: "Одобрить" }).click();
  } else {
    await approveButton.click();
  }

  const dialog = page.getByRole("dialog", { name: "Одобрить заявку" });
  await dialog.getByLabel("Комментарий").fill("Условия подходят");
  await dialog.getByRole("button", { name: "Одобрить" }).click();
  await expect(dialog).toBeHidden();

  const context = await request.get(
    `${apiBase}/v1/applications/${application.id}`,
  );
  const decided = await context.json();
  expect(decided.status).toBe("OFFERED");
  expect(decided.offer.amount).toBe(1_200_000);

  // Журнал АРМ показывает автора решения.
  await page.getByRole("tab", { name: "История" }).click();
  await expect(page.getByText("Аналитик Демо 1").first()).toBeVisible();

  const clientPage = await browser.newPage();
  await clientPage.goto(`${clientBase}/login`);
  await clientPage.getByRole("button", { name: /Анна Лесовая/i }).click();
  await clientPage.goto(`${clientBase}/applications/${application.id}`);
  await expect(clientPage.getByText("Заявка одобрена").first()).toBeVisible();
  await clientPage.close();
});
