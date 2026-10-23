import type { DemoAccountApi, ApiProductCatalog } from "@repo/contracts/api";
import type { Employee } from "@repo/contracts/application";
import {
  CREDIT_PRODUCTS,
  DEFAULT_KEY_RATE,
} from "@repo/contracts/product-catalog";
import type { BkiReport, EgrulRecord, FnsProfile } from "@repo/contracts";

export interface DemoSourceRecord {
  egrul: EgrulRecord;
  bki: BkiReport;
  fns: FnsProfile;
}

export const demoProducts: ApiProductCatalog["products"] = CREDIT_PRODUCTS.map(
  (product) => ({ ...product }),
);

export const demoCatalog: ApiProductCatalog = {
  keyRate: DEFAULT_KEY_RATE.value,
  keyRateDate: DEFAULT_KEY_RATE.date,
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
