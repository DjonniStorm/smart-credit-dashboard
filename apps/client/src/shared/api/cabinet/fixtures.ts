import type { DemoAccount, ProductCatalog } from "@repo/contracts/cabinet";

// Синтетические данные прототипа. Компании, люди, ИНН и показатели выдуманы
// и не совпадают с реальными намеренно.

/**
 * Ключевая ставка Банка России: 14 % с решения от 11.09.2026.
 * Следующее заседание 23.10.2026, после него значение нужно сверить с cbr.ru.
 */
export const KEY_RATE = { value: 14, date: "2026-09-11" } as const;

export const catalog: ProductCatalog = {
  keyRate: KEY_RATE.value,
  keyRateDate: KEY_RATE.date,
  products: [
    {
      id: "working-capital",
      name: "Оборотный кредит",
      purposes: ["working_capital"],
      description:
        "Закупка товара и сырья, оплата подрядчиков и аренды. Погашение равными платежами.",
      minAmount: 300_000,
      maxAmount: 10_000_000,
      minTermMonths: 3,
      maxTermMonths: 24,
      spreadPp: 5,
      collateral: null,
    },
    {
      id: "cash-gap",
      name: "Кредит на кассовый разрыв",
      purposes: ["cash_gap", "working_capital"],
      description:
        "Короткие деньги, пока покупатели не оплатили отгрузку. Небольшая сумма на срок до года.",
      minAmount: 100_000,
      maxAmount: 3_000_000,
      minTermMonths: 1,
      maxTermMonths: 12,
      spreadPp: 6,
      collateral: null,
    },
    {
      id: "equipment",
      name: "Кредит на оборудование и транспорт",
      purposes: ["equipment"],
      description:
        "Покупка станков, техники, транспорта. Купленное имущество становится залогом, поэтому ставка ниже.",
      minAmount: 500_000,
      maxAmount: 30_000_000,
      minTermMonths: 12,
      maxTermMonths: 60,
      spreadPp: 3.5,
      collateral: "Приобретаемое оборудование или транспорт",
    },
    {
      id: "development",
      name: "Кредит на развитие",
      purposes: ["development"],
      description:
        "Открытие точки, ремонт, новое направление. Нужен поручитель: собственник бизнеса.",
      minAmount: 1_000_000,
      maxAmount: 20_000_000,
      minTermMonths: 12,
      maxTermMonths: 60,
      spreadPp: 4.5,
      collateral: "Поручительство собственника",
    },
  ],
};

export const accounts: DemoAccount[] = [
  {
    id: "bakery",
    person: "Анна Лесовая",
    role: "Генеральный директор",
    scenario:
      "Чистая история и стабильные обороты. Сумма до 3 млн ₽ одобряется сразу, крупная сумма приходит со встречным предложением.",
    company: {
      inn: "9901000017",
      ogrn: "1209900000017",
      form: "ooo",
      name: "ООО «Пекарня на Лесной»",
      registeredAt: "2020-03-12",
      okved: "10.71",
      okvedName: "Производство хлеба и мучных кондитерских изделий",
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
    scenario:
      "У ИП есть долг по налогам в данных ФНС. Банк попросит справку, после ответа заявка вернётся на проверку и получит решение.",
    company: {
      inn: "990200000025",
      ogrn: "321990000000025",
      form: "ip",
      name: "ИП Столяров Дмитрий Олегович",
      registeredAt: "2021-06-01",
      okved: "16.23",
      okvedName: "Производство деревянных строительных конструкций",
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
    scenario:
      "В кредитной истории просрочка больше 30 дней. Заявка получит отказ с объяснением и советом, что сделать.",
    company: {
      inn: "9903000033",
      ogrn: "1229900000033",
      form: "ooo",
      name: "ООО «Тестовые перевозки»",
      registeredAt: "2022-09-20",
      okved: "49.41",
      okvedName: "Деятельность автомобильного грузового транспорта",
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

/** Заглушки БКИ и ФНС «Прозрачный бизнес» по ИНН. */
export const externalChecks: Record<
  string,
  { overdueDays: number; activeLoans: number; taxDebt: number }
> = {
  "9901000017": { overdueDays: 0, activeLoans: 1, taxDebt: 0 },
  "990200000025": { overdueDays: 0, activeLoans: 0, taxDebt: 46_300 },
  "9903000033": { overdueDays: 47, activeLoans: 3, taxDebt: 0 },
};
