import { expect, test } from "@playwright/test";

const baseURL = process.env.CLIENT_BASE_URL ?? "http://localhost:3000";

test.describe("client cabinet application lifecycle", () => {
  async function signIn(page, person) {
    await page.goto(`${baseURL}/login`);
    await page.getByRole("button", { name: new RegExp(person, "i") }).click();
    await expect(page).toHaveURL(/\/$/);
  }

  async function createApplication(page, amount) {
    await page.goto(
      `${baseURL}/applications/new?purpose=working_capital&product=working-capital&amount=${amount}&term=12`,
    );
    for (let step = 0; step < 4; step += 1) {
      await page.getByRole("button", { name: "Продолжить" }).click();
    }
    await page.getByRole("checkbox", { name: /БКИ/i }).check();
    await page.getByRole("checkbox", { name: /персональн/i }).check();
    await page.getByRole("button", { name: /отправить/i }).click();
    await expect(page).toHaveURL(/applications\//);
  }

  test("answers a bank request and exposes the uploaded document", async ({
    page,
  }) => {
    await signIn(page, "Дмитрий Столяров");
    await createApplication(page, 1_000_000);
    await expect(page.locator('[data-testid="answer-request"]')).toBeVisible({
      timeout: 15_000,
    });

    await page
      .locator('[data-testid="answer-request"] textarea')
      .fill("Справка получена, задолженность погашена.");
    await page.locator('[data-testid="answer-request-submit"]').click();
    await expect(page.locator('[data-testid="answer-request"]')).toHaveCount(0);

    await page.goto(`${baseURL}/documents`);
    await expect(
      page.locator('[data-testid="document-application-link"]'),
    ).toHaveCount(1);
  });

  test("accepts a counter-offer and signs with the demo code", async ({
    page,
  }) => {
    await signIn(page, "Анна Лесовая");
    await createApplication(page, 10_000_000);
    await expect(page.locator('[data-testid="offer-decision"]')).toBeVisible({
      timeout: 15_000,
    });
    await page.locator('[data-testid="offer-accept"]').click();
    await expect(page.getByRole("link", { name: /подпис/i })).toBeVisible();

    await page.getByRole("link", { name: /подпис/i }).click();
    await page.getByRole("button", { name: /получить код/i }).click();
    const demoCode = await page
      .locator('[data-testid="sign-demo-code"]')
      .innerText();
    const code = demoCode.match(/\d{6}/)?.[0];
    expect(code).toHaveLength(6);
    await page.locator('[data-testid="sign-code"]').fill(code);
    await page.locator('[data-testid="sign-submit"]').click();
    await expect(page).toHaveURL(/applications\//);
  });

  test("negotiation simulator offers terms and applies them to the sandbox only", async ({
    page,
  }) => {
    await signIn(page, "Анна Лесовая");
    await createApplication(page, 1_000_000);
    const applicationUrl = page.url();

    await page
      .getByRole("group", { name: "Что для вас важнее" })
      .getByText("Сумма", { exact: true })
      .click();
    const options = page.locator('[data-testid="negotiation-option"]');
    await expect(options.first()).toBeVisible();
    await expect(options.first()).toContainText("Это не одобрение");

    const apply = options.first().getByRole("button");
    await apply.click();
    await expect(apply).toContainText("Подставлено в песочницу");
    expect(page.url()).toBe(applicationUrl);
  });
});
