import type { DemoAccountApi, ApiProductCatalog } from "@repo/contracts/api";
import type { Employee } from "@repo/contracts/application";
import type { BkiReport, EgrulRecord, FnsProfile } from "@repo/contracts";

export interface DemoSourceRecord {
  egrul: EgrulRecord;
  bki: BkiReport;
  fns: FnsProfile;
}

export const demoProducts: ApiProductCatalog["products"] = [
  {
    id: "working_capital",
    name: "Оборотный кредит",
    purpose: "Оборот и закупка",
    purposes: ["working_capital"],
    description: "Закупка товара, сырья и оплата подрядчиков.",
    minAmount: 300_000,
    maxAmount: 10_000_000,
    minTermMonths: 3,
    maxTermMonths: 24,
    spreadPp: 5,
    maxDebtLoad: 0.6,
    minBusinessAgeMonths: 12,
    collateral: null,
  },
  {
    id: "cash_gap",
    name: "Кассовый разрыв",
    purpose: "Краткосрочный разрыв",
    purposes: ["cash_gap", "working_capital"],
    description: "Короткое финансирование до оплаты покупателями.",
    minAmount: 100_000,
    maxAmount: 3_000_000,
    minTermMonths: 1,
    maxTermMonths: 12,
    spreadPp: 6,
    maxDebtLoad: 0.5,
    minBusinessAgeMonths: 6,
    collateral: null,
  },
  {
    id: "equipment",
    name: "Оборудование",
    purpose: "Оборудование и транспорт",
    purposes: ["equipment"],
    description: "Покупка техники и оборудования с залогом приобретаемого имущества.",
    minAmount: 500_000,
    maxAmount: 30_000_000,
    minTermMonths: 12,
    maxTermMonths: 60,
    spreadPp: 3.5,
    maxDebtLoad: 0.7,
    minBusinessAgeMonths: 12,
    collateral: "Приобретаемое оборудование или транспорт",
  },
  {
    id: "development",
    name: "Развитие",
    purpose: "Новая точка или направление",
    purposes: ["development"],
    description: "Расширение бизнеса с поручительством собственника.",
    minAmount: 1_000_000,
    maxAmount: 20_000_000,
    minTermMonths: 12,
    maxTermMonths: 60,
    spreadPp: 4.5,
    maxDebtLoad: 0.65,
    minBusinessAgeMonths: 24,
    collateral: "Поручительство собственника",
  },
];

export const demoCatalog: ApiProductCatalog = {
  keyRate: 14,
  keyRateDate: "2026-09-11",
  products: demoProducts,
};

export const demoEmployees: Employee[] = [
  { id: "an-1", name: "Аналитик Демо 1", role: "analyst", approvalLimit: 5_000_000 },
  { id: "an-2", name: "Аналитик Демо 2", role: "analyst", approvalLimit: 5_000_000 },
  { id: "lead-1", name: "Руководитель Демо", role: "lead", approvalLimit: 60_000_000 },
];

export const demoSources: Record<string, DemoSourceRecord> = {
  "9901000017": {
    egrul: { inn: "9901000017", ogrn: "1209900000017", name: "ООО «Пекарня на Лесной»", status: "Действующее", registeredAt: "2020-03-12", okved: "10.71" },
    bki: { inn: "9901000017", activeLoans: 1, totalDebtRub: 800_000, overdueDays: 0 },
    fns: { inn: "9901000017", taxDebtRub: 0, employees: 18, massRegistrationAddress: false },
  },
  "990200000025": {
    egrul: { inn: "990200000025", ogrn: "321990000000025", name: "ИП Столяров Дмитрий Олегович", status: "Действующее", registeredAt: "2021-06-01", okved: "16.23" },
    bki: { inn: "990200000025", activeLoans: 0, totalDebtRub: 0, overdueDays: 0 },
    fns: { inn: "990200000025", taxDebtRub: 46_300, employees: 4, massRegistrationAddress: false },
  },
  "9903000033": {
    egrul: { inn: "9903000033", ogrn: "1229900000033", name: "ООО «Тестовые перевозки»", status: "Действующее", registeredAt: "2022-09-20", okved: "49.41" },
    bki: { inn: "9903000033", activeLoans: 3, totalDebtRub: 4_500_000, overdueDays: 47 },
    fns: { inn: "9903000033", taxDebtRub: 0, employees: 9, massRegistrationAddress: false },
  },
};

export const demoAccounts: DemoAccountApi[] = [
  {
    id: "bakery",
    person: "Анна Лесовая",
    role: "Генеральный директор",
    scenario: "Стабильные обороты и чистая кредитная история.",
    company: {
      inn: "9901000017",
      ogrn: "1209900000017",
      form: "ooo",
      name: "ООО «Пекарня на Лесной»",
      registeredAt: "2020-03-12",
      okved: "10.71",
      okvedName: "Производство хлеба и мучных изделий",
      address: "г. Тестовск, ул. Лесная, д. 4",
      head: "Лесовая Анна Игоревна",
    },
    knownFinancials: {
      revenueLastYear: 28_400_000,
      avgMonthlyTurnover: 2_350_000,
      monthlyDebtPayments: 120_000,
      employees: 18,
    },
  },
  {
    id: "workshop",
    person: "Дмитрий Столяров",
    role: "Индивидуальный предприниматель",
    scenario: "Налоговый долг требует дополнительного подтверждения.",
    company: {
      inn: "990200000025",
      ogrn: "321990000000025",
      form: "ip",
      name: "ИП Столяров Дмитрий Олегович",
      registeredAt: "2021-06-01",
      okved: "16.23",
      okvedName: "Производство деревянных конструкций",
      address: "г. Тестовск, Промышленный пр., д. 11",
      head: "Столяров Дмитрий Олегович",
    },
    knownFinancials: {
      revenueLastYear: 9_600_000,
      avgMonthlyTurnover: 780_000,
      monthlyDebtPayments: 0,
      employees: 4,
    },
  },
  {
    id: "logistics",
    person: "Ольга Путева",
    role: "Финансовый директор",
    scenario: "Просрочка в БКИ переводит заявку на ручное решение.",
    company: {
      inn: "9903000033",
      ogrn: "1229900000033",
      form: "ooo",
      name: "ООО «Тестовые перевозки»",
      registeredAt: "2022-09-20",
      okved: "49.41",
      okvedName: "Деятельность автомобильного транспорта",
      address: "г. Тестовск, ш. Окружное, д. 2",
      head: "Путев Сергей Андреевич",
    },
    knownFinancials: {
      revenueLastYear: 15_200_000,
      avgMonthlyTurnover: 1_260_000,
      monthlyDebtPayments: 310_000,
      employees: 9,
    },
  },
];
