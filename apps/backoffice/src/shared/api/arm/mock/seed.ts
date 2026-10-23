// Синтетические данные для демо. Компании, ИНН и люди выдуманы:
// ИНН начинаются с 00, такого кода региона нет, совпасть с настоящей компанией они не могут.
import type {
  Applicant,
  CheckSource,
  ClientResponse,
  CreditProduct,
  Employee,
  EmployeeAction,
  LoanRequest,
} from "@repo/contracts/application";

import type { RawSources } from "./engine";
import {
  type MockRecord,
  applyAction,
  applyClientResponse,
  submit,
  tick,
} from "./flow";

export const products: CreditProduct[] = [
  {
    id: "express",
    name: "Экспресс-кредит",
    purpose: "Срочные платежи, без залога",
    minAmount: 100_000,
    maxAmount: 3_000_000,
    minTermMonths: 3,
    maxTermMonths: 24,
    ratePct: 26,
    minScore: 60,
    maxDebtLoad: 0.5,
    minBusinessAgeMonths: 6,
  },
  {
    id: "working_capital",
    name: "Оборотный кредит",
    purpose: "Закупка товара, зарплата, налоги",
    minAmount: 500_000,
    maxAmount: 15_000_000,
    minTermMonths: 6,
    maxTermMonths: 36,
    ratePct: 23,
    minScore: 55,
    maxDebtLoad: 0.6,
    minBusinessAgeMonths: 12,
  },
  {
    id: "credit_line",
    name: "Кредитная линия",
    purpose: "Кассовые разрывы, деньги частями",
    minAmount: 1_000_000,
    maxAmount: 30_000_000,
    minTermMonths: 12,
    maxTermMonths: 36,
    ratePct: 24,
    minScore: 60,
    maxDebtLoad: 0.6,
    minBusinessAgeMonths: 12,
  },
  {
    id: "investment",
    name: "Инвестиционный кредит",
    purpose: "Оборудование, транспорт, ремонт",
    minAmount: 2_000_000,
    maxAmount: 60_000_000,
    minTermMonths: 12,
    maxTermMonths: 84,
    ratePct: 21,
    minScore: 65,
    maxDebtLoad: 0.7,
    minBusinessAgeMonths: 24,
  },
  {
    id: "cash_gap",
    name: "Кассовый разрыв",
    purpose: "Краткосрочное покрытие разрыва до оплаты покупателей",
    minAmount: 100_000,
    maxAmount: 3_000_000,
    minTermMonths: 1,
    maxTermMonths: 12,
    ratePct: 26,
    minScore: 55,
    maxDebtLoad: 0.5,
    minBusinessAgeMonths: 6,
    collateral: null,
  },
  {
    id: "equipment",
    name: "Оборудование",
    purpose: "Покупка оборудования и транспорта",
    minAmount: 500_000,
    maxAmount: 30_000_000,
    minTermMonths: 12,
    maxTermMonths: 60,
    ratePct: 21.5,
    minScore: 60,
    maxDebtLoad: 0.7,
    minBusinessAgeMonths: 12,
    collateral: "Приобретаемое оборудование или транспорт",
  },
  {
    id: "development",
    name: "Развитие",
    purpose: "Новая точка или направление бизнеса",
    minAmount: 1_000_000,
    maxAmount: 20_000_000,
    minTermMonths: 12,
    maxTermMonths: 60,
    ratePct: 22.5,
    minScore: 65,
    maxDebtLoad: 0.65,
    minBusinessAgeMonths: 24,
    collateral: "Поручительство собственника",
  },
];

export const employees: Employee[] = [
  {
    id: "an-1",
    name: "Аналитик Демо 1",
    role: "analyst",
    approvalLimit: 5_000_000,
  },
  {
    id: "an-2",
    name: "Аналитик Демо 2",
    role: "analyst",
    approvalLimit: 5_000_000,
  },
  {
    id: "lead-1",
    name: "Руководитель Демо",
    role: "lead",
    approvalLimit: 60_000_000,
  },
];

const H = 3_600_000;
const M = 60_000;
/** Ответы источников в демо-истории: доли секунды и секунды. */
const FAST: Record<CheckSource, number> = {
  egrul: 640,
  fns: 1_180,
  bki: 2_350,
};
/** Живая заявка: ответы растянуты, чтобы проверки было видно. */
const LIVE: Record<CheckSource, number> = {
  egrul: 4_000,
  fns: 7_000,
  bki: 11_000,
};

type Step =
  | { at: number; action: EmployeeAction; by: string }
  | { at: number; client: ClientResponse };

interface Spec {
  number: number;
  hoursAgo: number;
  applicant: Applicant;
  request: LoanRequest;
  raw: Omit<RawSources, "egrul"> & {
    egrul?: Partial<RawSources["egrul"]>;
  };
  assigneeId: string | null;
  live?: boolean;
  failOnce?: CheckSource[];
  steps?: Step[];
}

function ooo(
  inn: string,
  name: string,
  director: string,
  okved: string,
  region: string,
  registeredAt: string,
  annualRevenue: number,
): Applicant {
  return {
    inn,
    ogrn: `00${inn}1`.slice(0, 13),
    name,
    legalForm: "ooo",
    okved,
    region,
    registeredAt,
    director,
    annualRevenue,
  };
}

function ip(
  inn: string,
  fio: string,
  okved: string,
  region: string,
  registeredAt: string,
  annualRevenue: number,
): Applicant {
  return {
    inn,
    ogrn: `00${inn}1`.slice(0, 15),
    name: `ИП ${fio}`,
    legalForm: "ip",
    okved,
    region,
    registeredAt,
    director: fio,
    annualRevenue,
  };
}

const clean = (employees: number, debt = 0, loans = 0) => ({
  fns: { taxDebtRub: 0, employees, massRegistrationAddress: false },
  bki: { activeLoans: loans, totalDebtRub: debt, overdueDays: 0 },
});

const specs: Spec[] = [
  {
    number: 1012,
    hoursAgo: 0,
    live: true,
    applicant: ooo(
      "0012345012",
      "ООО «Демо Пекарня»",
      "Тестова М. А.",
      "10.71 Производство хлеба",
      "Москва",
      "2019-03-14",
      24_000_000,
    ),
    request: {
      productId: "working_capital",
      amount: 1_800_000,
      termMonths: 18,
      purpose: "Закупка муки и упаковки на сезон",
    },
    raw: clean(14, 2_100_000, 1),
    assigneeId: null,
  },
  {
    number: 1011,
    hoursAgo: 0.6,
    applicant: ip(
      "001234501101",
      "Тестов И. И.",
      "49.41 Грузовые перевозки",
      "Новосибирская обл.",
      "2021-06-01",
      4_200_000,
    ),
    request: {
      productId: "express",
      amount: 600_000,
      termMonths: 12,
      purpose: "Ремонт грузовика",
    },
    raw: clean(1, 300_000, 1),
    failOnce: ["bki"],
    assigneeId: "an-1",
  },
  {
    number: 1010,
    hoursAgo: 2.5,
    applicant: ooo(
      "0012345010",
      "ООО «Демо Логистика»",
      "Пробный К. С.",
      "52.10 Складское хозяйство",
      "Московская обл.",
      "2018-09-20",
      10_000_000,
    ),
    request: {
      productId: "working_capital",
      amount: 4_500_000,
      termMonths: 24,
      purpose: "Аренда склада и зарплата на период сезона",
    },
    raw: clean(9, 2_000_000, 2),
    assigneeId: "an-1",
  },
  {
    number: 1009,
    hoursAgo: 4,
    applicant: ooo(
      "0012345009",
      "ООО «Демо Стройсервис»",
      "Образцова Л. Н.",
      "43.39 Отделочные работы",
      "Санкт-Петербург",
      "2016-02-11",
      40_000_000,
    ),
    request: {
      productId: "investment",
      amount: 12_000_000,
      termMonths: 60,
      purpose: "Покупка спецтехники",
    },
    raw: clean(32, 5_000_000, 2),
    assigneeId: "an-2",
  },
  {
    number: 1008,
    hoursAgo: 5,
    applicant: ooo(
      "0012345008",
      "ООО «Демо Агро»",
      "Демонстрационный В. И.",
      "01.11 Выращивание зерновых",
      "Краснодарский край",
      "2017-04-03",
      18_000_000,
    ),
    request: {
      productId: "credit_line",
      amount: 3_000_000,
      termMonths: 24,
      purpose: "Кассовые разрывы до сбора урожая",
    },
    raw: {
      fns: {
        taxDebtRub: 180_000,
        employees: 11,
        massRegistrationAddress: false,
      },
      bki: { activeLoans: 1, totalDebtRub: 1_500_000, overdueDays: 0 },
    },
    assigneeId: null,
  },
  {
    number: 1007,
    hoursAgo: 26,
    applicant: ip(
      "001234500707",
      "Пробная А. А.",
      "96.02 Парикмахерские услуги",
      "Казань",
      "2020-10-15",
      3_600_000,
    ),
    request: {
      productId: "express",
      amount: 400_000,
      termMonths: 12,
      purpose: "Новое оборудование для салона",
    },
    raw: {
      fns: { taxDebtRub: 42_000, employees: 3, massRegistrationAddress: false },
      bki: { activeLoans: 0, totalDebtRub: 0, overdueDays: 0 },
    },
    assigneeId: "an-1",
    steps: [
      {
        at: 3 * H,
        by: "an-1",
        action: {
          type: "request_info",
          items: ["Справка об отсутствии налоговой задолженности"],
          comment: "Задолженность 42 000 ₽ по данным ФНС",
        },
      },
    ],
  },
  {
    number: 1006,
    hoursAgo: 30,
    applicant: ooo(
      "0012345006",
      "ООО «Демо Мебель»",
      "Тестов Р. Д.",
      "31.09 Производство мебели",
      "Екатеринбург",
      "2019-07-22",
      7_000_000,
    ),
    request: {
      productId: "working_capital",
      amount: 2_500_000,
      termMonths: 18,
      purpose: "Закупка плиты и фурнитуры",
    },
    raw: clean(6, 2_000_000, 2),
    assigneeId: "an-2",
    steps: [
      {
        at: 2 * H,
        by: "an-2",
        action: {
          type: "counter_offer",
          terms: {
            productId: "working_capital",
            amount: 2_200_000,
            termMonths: 18,
            ratePct: 23,
          },
          comment: "Сумма снижена до предела нагрузки",
        },
      },
    ],
  },
  {
    number: 1005,
    hoursAgo: 28,
    applicant: ooo(
      "0012345005",
      "ООО «Демо Сервис»",
      "Пробная Е. В.",
      "33.12 Ремонт оборудования",
      "Нижний Новгород",
      "2015-05-30",
      15_000_000,
    ),
    request: {
      productId: "express",
      amount: 1_200_000,
      termMonths: 12,
      purpose: "Запчасти под крупный заказ",
    },
    raw: clean(8, 800_000, 1),
    assigneeId: "an-1",
    steps: [
      {
        at: 1 * H,
        by: "an-1",
        action: { type: "approve", comment: "" },
      },
    ],
  },
  {
    number: 1004,
    hoursAgo: 72,
    applicant: ip(
      "001234500404",
      "Образцов П. П.",
      "47.11 Розничная торговля продуктами",
      "Тверь",
      "2014-01-20",
      9_000_000,
    ),
    request: {
      productId: "working_capital",
      amount: 900_000,
      termMonths: 12,
      purpose: "Товарный запас к праздникам",
    },
    raw: clean(4, 0, 0),
    assigneeId: "an-2",
    steps: [
      { at: 2 * H, by: "an-2", action: { type: "approve", comment: "" } },
      { at: 20 * H, client: "contract_signed" },
    ],
  },
  {
    number: 1003,
    hoursAgo: 50,
    applicant: ooo(
      "0012345003",
      "ООО «Демо Трейд»",
      "Демонстрационная О. Г.",
      "46.90 Оптовая торговля",
      "Ростов-на-Дону",
      "2020-11-05",
      12_000_000,
    ),
    request: {
      productId: "credit_line",
      amount: 5_000_000,
      termMonths: 24,
      purpose: "Пополнение оборотных средств",
    },
    raw: { ...clean(0, 4_000_000, 3), egrul: { status: "liquidating" } },
    assigneeId: "an-1",
    steps: [
      {
        at: 1.5 * H,
        by: "an-1",
        action: {
          type: "reject",
          reason: "company_inactive",
          comment: "По ЕГРЮЛ идёт ликвидация",
        },
      },
    ],
  },
  {
    number: 1002,
    hoursAgo: 7,
    applicant: ooo(
      "0012345002",
      "ООО «Демо Ремонт»",
      "Тестова Н. Ю.",
      "43.21 Электромонтажные работы",
      "Самара",
      "2022-08-09",
      6_000_000,
    ),
    request: {
      productId: "express",
      amount: 800_000,
      termMonths: 12,
      purpose: "Материалы под контракт",
    },
    raw: {
      fns: { taxDebtRub: 0, employees: 5, massRegistrationAddress: false },
      bki: { activeLoans: 2, totalDebtRub: 1_400_000, overdueDays: 12 },
    },
    assigneeId: "an-2",
  },
  {
    number: 1001,
    hoursAgo: 9,
    applicant: ip(
      "001234500101",
      "Демонстрационный С. С.",
      "45.20 Ремонт автомобилей",
      "Воронеж",
      "2023-02-17",
      2_400_000,
    ),
    request: {
      productId: "express",
      amount: 700_000,
      termMonths: 18,
      purpose: "Подъёмник и инструмент",
    },
    raw: {
      fns: { taxDebtRub: 0, employees: 2, massRegistrationAddress: true },
      bki: { activeLoans: 4, totalDebtRub: 900_000, overdueDays: 45 },
    },
    assigneeId: null,
  },
];

export function createSeed(now: number): MockRecord[] {
  return specs.map((s) => {
    const t0 = now - s.hoursAgo * H;
    const id = String(s.number);
    const rec: MockRecord = {
      app: {
        id,
        number: id,
        createdAt: new Date(t0).toISOString(),
        updatedAt: new Date(t0).toISOString(),
        status: "draft",
        stage: "intake",
        waitingOn: "system",
        hold: null,
        urgent: false,
        urgentReason: null,
        comments: [],
        handoff: null,
        blocker: "",
        assigneeId: s.assigneeId,
        applicant: s.applicant,
        request: s.request,
        checks: [],
        scoring: null,
        decision: null,
        offer: null,
        requestedInfo: [],
        rejectReason: null,
        events: [],
      },
      raw: {
        ...s.raw,
        egrul: {
          status: "active",
          ogrn: s.applicant.ogrn,
          okved: s.applicant.okved,
          ...s.raw.egrul,
        },
      },
      due: {},
      failOnce: s.failOnce ?? [],
    };
    submit(rec, t0, s.live ? LIVE : FAST);
    if (s.live) return rec;
    tick(rec, t0 + 15 * M, products);
    for (const step of s.steps ?? []) {
      if ("client" in step) {
        applyClientResponse(rec, step.client, t0 + step.at);
      } else {
        const by = employees.find((e) => e.id === step.by)!;
        applyAction(rec, step.action, by, employees, products, t0 + step.at);
      }
      tick(rec, t0 + step.at + 15 * M, products);
    }
    return rec;
  });
}
