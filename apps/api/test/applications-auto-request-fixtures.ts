/** Моки ответа companies.check для тестов автозапроса по расхождению источников. */

/** Чистые источники без расхождений. */
export const cleanResult = {
  inn: "7701234567",
  sources: {
    egrul: {
      inn: "7701234567",
      ogrn: "1",
      name: "ООО Тест",
      status: "Действующее",
      registeredAt: "2020-01-01",
      okved: "47.11",
    },
    bki: {
      inn: "7701234567",
      activeLoans: 1,
      totalDebtRub: 100,
      overdueDays: 0,
    },
    fns: {
      inn: "7701234567",
      taxDebtRub: 0,
      employees: 2,
      massRegistrationAddress: false,
    },
  },
  scoring: {
    inn: "7701234567",
    score: 82,
    model: "baseline-v1",
    grade: "B",
    risk_band: "low",
    readiness_index: 100,
    confidence: 0.9,
    recommendation: "approve",
  },
};

/**
 * Логистика (9903000033): сценарий демо-данных помечает расхождение ИНН
 * egrul (9903000033) и fns (9903000034). Источники при этом отвечают.
 */
export const logisticsResult = {
  inn: "9903000033",
  sources: {
    egrul: {
      inn: "9903000033",
      ogrn: "1229900000033",
      name: "ООО «Тестовые перевозки»",
      status: "Действующее",
      registeredAt: "2022-09-20",
      okved: "49.41",
    },
    bki: {
      inn: "9903000033",
      activeLoans: 3,
      totalDebtRub: 4_500_000,
      overdueDays: 47,
    },
    fns: {
      inn: "9903000034",
      taxDebtRub: 0,
      employees: 9,
      massRegistrationAddress: false,
    },
  },
  scoring: {
    inn: "9903000033",
    score: 70,
    model: "baseline-v1",
    grade: "B",
    risk_band: "low",
    readiness_index: 100,
    confidence: 0.9,
    recommendation: "approve",
  },
};
