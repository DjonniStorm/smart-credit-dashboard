import { expect, test } from "@playwright/test";

const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";
const clientBase = process.env.CLIENT_BASE_URL ?? "http://localhost:3000";
const backofficeBase =
  process.env.BACKOFFICE_BASE_URL ?? "http://localhost:3001";

/** Подсказка Альфи перекрывает нижний правый угол и мешает кликам. */
async function hideAlfi(target) {
  await target
    .locator('[aria-label="Подсказка Альфи"]')
    .evaluate(
      (el) => {
        el.style.display = "none";
      },
      { timeout: 3000 },
    )
    .catch(() => {});
}

/** Ждём завершения задачи скоринга: суффикс `succeeded`/`failed`. */
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

test("клиент создаёт заявку через мастер и доводит её до FUNDED", async ({
  request,
  page,
  browser,
}) => {
  // Мастер, Next-серверы и проверка банка: путь длинный, даём запас сверх 45 с.
  test.setTimeout(180_000);

  // Данные для чтения заявки API: сессия клиента на request-контексте.
  const signIn = await request.post(`${apiBase}/v1/auth/demo-sign-in`, {
    data: { accountId: "bakery" },
  });
  expect(signIn.ok()).toBeTruthy();

  // 1. Вход в кабинет под демо-учёткой пекарни.
  await page.goto(`${clientBase}/login`);
  await page.getByRole("button", { name: /Анна Лесовая/i }).click();
  await page.waitForURL(`${clientBase}/`);
  await hideAlfi(page);

  // 2. Новая заявка: продукт, сумма, срок, согласия. Финансы и компания
  //    подставляются из демо-сессии, файлы в прототипе не отправляются.
  await page.goto(`${clientBase}/applications/new`);
  await page.getByRole("combobox", { name: "Продукт" }).click();
  await page.getByRole("option", { name: "Оборотный кредит" }).click();
  await page.getByLabel("Сколько нужно").fill("2000000");
  await page.getByLabel("На какой срок").fill("12");
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Продолжить" }).click();

  await page
    .getByRole("checkbox", {
      name: "Согласен на запрос кредитной истории компании и руководителя в бюро кредитных историй",
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: "Согласен на обработку персональных данных для рассмотрения заявки",
    })
    .check();

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/applications") &&
        r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Отправить заявку" }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
  const created = await response.json();
  const applicationId = created.application.id;
  expect(applicationId).toMatch(/^app-/);

  // 3. Проверки запускаются сразу при создании; ждём завершения задачи.
  const finished = await waitForJob(request, created.checkJob.id);
  expect(finished.status).toBe("succeeded");

  // 4. Менеджер одобряет заявку в АРМ: статус становится OFFERED.
  const managerPage = await browser.newPage();
  await managerPage.goto(`${backofficeBase}/login`);
  await managerPage.getByText("Аналитик Демо 1").click();
  await managerPage.getByRole("button", { name: "Войти" }).click();
  await managerPage.goto(`${backofficeBase}/applications/${applicationId}`);
  await hideAlfi(managerPage);

  const approveButton = managerPage.getByRole("button", {
    name: "Одобрить",
    exact: true,
  });
  const moreActions = managerPage.getByRole("button", {
    name: "Другие действия",
  });
  await expect(moreActions.or(approveButton)).toBeVisible();
  if (await approveButton.isVisible()) {
    await approveButton.click();
  } else {
    await moreActions.click();
    await managerPage.getByRole("menuitem", { name: "Одобрить" }).click();
  }

  const dialog = managerPage.getByRole("dialog", { name: "Одобрить заявку" });
  await dialog.getByLabel("Комментарий").fill("Условия подходят");
  await dialog.getByRole("button", { name: "Одобрить" }).click();
  await expect(dialog).toBeHidden();

  // Клиентская страница опрашивает заявку сама и показывает предложение.
  await page.getByTestId("offer-accept").click();

  // Система готовит договор: ACCEPTED → SIGNING, затем подписание.
  await page.getByRole("button", { name: "Перейти к подписанию" }).click();
  await page.getByRole("button", { name: "Получить код" }).click();
  const hint = await page.getByTestId("sign-demo-code").textContent();
  const code = hint.match(/\d{6}/)[0];
  await page.getByTestId("sign-code").locator("input").first().click();
  await page.keyboard.type(code);
  await page.getByTestId("sign-submit").click();

  // 5–6. После подписи заявка FUNDED, у клиента экран «Деньги на счёте».
  await page.waitForURL(`${clientBase}/applications/${applicationId}`);
  await expect(page.getByText("Деньги на счёте").first()).toBeVisible();

  const funded = await (
    await request.get(`${apiBase}/v1/applications/${applicationId}`)
  ).json();
  expect(funded.status).toBe("FUNDED");
  expect(funded.deal.signedAt).toBeTruthy();
  await managerPage.close();
});
