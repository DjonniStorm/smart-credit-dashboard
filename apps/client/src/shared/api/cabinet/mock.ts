import type {
  Application,
  ApplicationEvent,
  ApplicationInput,
  ClientAnswer,
  DemoAccount,
} from "@repo/contracts/cabinet";

import { decide } from "./decide";
import {
  getMockCompanyProfile,
  grantMockBkiConsent,
} from "./company-profile-mock";
import { accounts, catalog } from "./fixtures";
import { ApiError, type CabinetApi } from "./types";

// Мок бэкенда в браузере. Состояние в localStorage, чтобы сценарий переживал
// перезагрузку. Банк «работает» по таймерам: статус пересчитывается при каждом
// чтении заявки, поэтому опрос с клиента видит движение без фоновых задач.

const STORAGE_KEY = "kk-cabinet-mock-v1";
/** Пауза между этапами автоматической проверки. */
const CHECK_STEP_MS = 2_500;
const DISBURSE_MS = 4_000;
const LATENCY_MS = 350;

interface Meta {
  /** Когда заявка (снова) ушла на проверку. */
  reviewStartedAt?: number;
  /** Сколько этапов проверки пройдено к моменту reviewStartedAt. */
  checksAtStart?: number;
  signCode?: string;
  signedAt?: number;
}

interface State {
  accountId: string | null;
  applications: Application[];
  meta: Record<string, Meta>;
  seq: number;
}

const empty: State = { accountId: null, applications: [], meta: {}, seq: 0 };

function load(): State {
  if (typeof window === "undefined") return structuredClone(empty);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw
      ? { ...empty, ...(JSON.parse(raw) as State) }
      : structuredClone(empty);
  } catch {
    return structuredClone(empty);
  }
}

function save(state: State) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Приватный режим или переполнение: сценарий работает до перезагрузки.
  }
}

const delay = () => new Promise((r) => setTimeout(r, LATENCY_MS));
const iso = (ms: number) => new Date(ms).toISOString();

function event(
  at: number,
  actor: ApplicationEvent["actor"],
  text: string,
): ApplicationEvent {
  return { at: iso(at), actor, text };
}

function requireAccount(state: State): DemoAccount {
  const account = accounts.find((a) => a.id === state.accountId);
  if (!account) throw new ApiError("Войдите в кабинет", 401);
  return account;
}

function findApp(state: State, id: string): Application {
  const account = requireAccount(state);
  const app = state.applications.find(
    (a) => a.id === id && a.company.inn === account.company.inn,
  );
  if (!app) throw new ApiError("Заявка не найдена", 404);
  return app;
}

const CHECK_EVENTS = [
  "Данные компании сверены с ЕГРЮЛ/ЕГРИП",
  "Получены кредитная история и данные ФНС",
  "Рассчитана оценка риска",
];

/** Довести заявку до текущего момента: пройти этапы, вынести решение, выдать. */
function advance(state: State, app: Application, now: number): boolean {
  const meta = (state.meta[app.id] ??= {});
  let changed = false;

  if (app.status === "in_review" && meta.reviewStartedAt) {
    const start = meta.reviewStartedAt;
    const from = meta.checksAtStart ?? 0;
    while (app.checksPassed < 3) {
      const at = start + (app.checksPassed - from + 1) * CHECK_STEP_MS;
      if (at > now) break;
      app.events.push(event(at, "system", CHECK_EVENTS[app.checksPassed]!));
      app.checksPassed += 1;
      changed = true;
    }
    if (app.checksPassed === 3) {
      const at = start + (3 - from + 1) * CHECK_STEP_MS;
      if (at <= now) {
        applyVerdict(app, at);
        changed = true;
      }
    }
  }

  if (app.deal?.stage === "disbursing" && meta.signedAt) {
    const at = meta.signedAt + DISBURSE_MS;
    if (at <= now) {
      app.deal.stage = "done";
      app.deal.disbursedAt = iso(at);
      app.status = "disbursed";
      app.events.push(
        event(
          at,
          "bank",
          `Деньги зачислены на счёт ${app.deal.account}. Это моделируемая выдача, реальной проводки нет.`,
        ),
      );
      app.updatedAt = iso(at);
      changed = true;
    }
  }
  return changed;
}

function applyVerdict(app: Application, at: number) {
  const product = catalog.products.find((p) => p.id === app.productId);
  if (!product) throw new ApiError("Продукт не найден", 500);
  const verdict = decide(app, product, catalog.keyRate, new Date(at));
  app.updatedAt = iso(at);
  if (verdict.kind === "request") {
    app.status = "needs_client";
    app.requests.push({
      ...verdict.request,
      id: `${app.id}-r${app.requests.length + 1}`,
      createdAt: iso(at),
    });
    app.events.push(event(at, "bank", "Банк запросил уточнение"));
    return;
  }
  app.decision = { ...verdict.decision, decidedAt: iso(at) };
  app.status = verdict.decision.outcome;
  app.events.push(
    event(
      at,
      "bank",
      {
        approved: "Заявка одобрена",
        counter_offer: "Банк предложил другие условия",
        rejected: "Банк отказал",
      }[verdict.decision.outcome],
    ),
  );
}

/** Прочитать состояние, продвинуть заявки по времени, сохранить. */
function tick(): State {
  const state = load();
  const now = Date.now();
  let changed = false;
  for (const app of state.applications) {
    changed = advance(state, app, now) || changed;
  }
  if (changed) save(state);
  return state;
}

function mutate(id: string, fn: (app: Application, state: State) => void) {
  const state = tick();
  const app = findApp(state, id);
  fn(app, state);
  app.updatedAt = iso(Date.now());
  save(state);
  return structuredClone(app);
}

export const mockApi: CabinetApi = {
  async listDemoAccounts() {
    await delay();
    return structuredClone(accounts);
  },

  async currentAccount() {
    const state = load();
    return accounts.find((a) => a.id === state.accountId) ?? null;
  },

  async signIn(accountId) {
    await delay();
    const account = accounts.find((a) => a.id === accountId);
    if (!account) throw new ApiError("Учётка не найдена", 404);
    const state = load();
    state.accountId = account.id;
    save(state);
    return structuredClone(account);
  },

  async signOut() {
    const state = load();
    state.accountId = null;
    save(state);
  },

  async getCatalog() {
    await delay();
    return structuredClone(catalog);
  },

  async getCompanyProfile(inn) {
    await delay();
    return getMockCompanyProfile(inn);
  },

  async grantBkiConsent(inn) {
    await delay();
    return grantMockBkiConsent(inn);
  },

  async lookupCompany(inn) {
    await delay();
    const found = accounts.find((a) => a.company.inn === inn);
    if (!found) throw new ApiError("Компания с таким ИНН не найдена", 404);
    return structuredClone(found.company);
  },

  async listApplications() {
    await delay();
    const state = tick();
    const account = requireAccount(state);
    return structuredClone(
      state.applications
        .filter((a) => a.company.inn === account.company.inn)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async getApplication(id) {
    await delay();
    return structuredClone(findApp(tick(), id));
  },

  async createApplication(input: ApplicationInput) {
    await delay();
    const state = tick();
    const account = requireAccount(state);
    const product = catalog.products.find((p) => p.id === input.productId);
    if (!product) throw new ApiError("Продукт не найден", 400);
    const now = Date.now();
    state.seq += 1;
    const id = `app-${now.toString(36)}`;
    const app: Application = {
      ...input,
      id,
      number: `ДЕМО-${String(state.seq).padStart(4, "0")}`,
      status: "in_review",
      createdAt: iso(now),
      updatedAt: iso(now),
      company: account.company,
      checksPassed: 0,
      requests: [],
      decision: null,
      deal: null,
      events: [event(now, "client", "Заявка отправлена в банк")],
    };
    state.applications.push(app);
    state.meta[id] = { reviewStartedAt: now, checksAtStart: 0 };
    save(state);
    return structuredClone(app);
  },

  async answerRequest(id, requestId, answer: ClientAnswer) {
    await delay();
    return mutate(id, (app, state) => {
      const request = app.requests.find((r) => r.id === requestId);
      if (app.status !== "needs_client" || !request || request.answer) {
        throw new ApiError("На этот запрос уже ответили", 409);
      }
      const now = Date.now();
      request.answer = { ...answer, answeredAt: iso(now) };
      app.status = "in_review";
      // Повторно проходит только оценка: данные компании уже сверены.
      app.checksPassed = 2;
      state.meta[id] = { reviewStartedAt: now, checksAtStart: 2 };
      app.events.push(event(now, "client", "Вы ответили на запрос банка"));
    });
  },

  async acceptOffer(id) {
    await delay();
    return mutate(id, (app) => {
      const offer = app.decision?.offer;
      if (
        !offer ||
        (app.status !== "approved" && app.status !== "counter_offer") ||
        app.deal
      ) {
        throw new ApiError("Предложение уже недоступно", 409);
      }
      const now = Date.now();
      app.status = "approved";
      app.deal = {
        stage: "signing",
        terms: offer,
        acceptedAt: iso(now),
        signedAt: null,
        disbursedAt: null,
        account: `40702 810 0 0000 ${app.company.inn.slice(-6)}`,
      };
      app.events.push(event(now, "client", "Вы приняли условия банка"));
    });
  },

  async declineOffer(id) {
    await delay();
    return mutate(id, (app) => {
      if (app.status !== "counter_offer" && app.status !== "approved") {
        throw new ApiError("Предложение уже недоступно", 409);
      }
      if (app.deal) throw new ApiError("Условия уже приняты", 409);
      app.status = "rejected";
      app.events.push(
        event(Date.now(), "client", "Вы отказались от предложения"),
      );
    });
  },

  async requestSignCode(id) {
    await delay();
    const state = tick();
    const app = findApp(state, id);
    if (app.deal?.stage !== "signing") {
      throw new ApiError("Договор сейчас не ждёт подписи", 409);
    }
    const code = String(100_000 + Math.floor(Math.random() * 900_000));
    (state.meta[id] ??= {}).signCode = code;
    save(state);
    return { demoCode: code };
  },

  async sign(id, code) {
    await delay();
    return mutate(id, (app, state) => {
      const meta = (state.meta[id] ??= {});
      if (app.deal?.stage !== "signing") {
        throw new ApiError("Договор сейчас не ждёт подписи", 409);
      }
      if (!meta.signCode || meta.signCode !== code) {
        throw new ApiError(
          "Код не подходит. Проверьте цифры или запросите новый",
          422,
        );
      }
      const now = Date.now();
      meta.signedAt = now;
      delete meta.signCode;
      app.deal.stage = "disbursing";
      app.deal.signedAt = iso(now);
      app.events.push(
        event(
          now,
          "client",
          "Вы подписали кредитный договор кодом подтверждения",
        ),
      );
    });
  },
};

/** Сбросить демо-данные: для повторного прохода сценария. */
export function resetMockState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // нечего чистить
  }
}
