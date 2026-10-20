import type { BkiReport, EgrulRecord, FnsProfile } from "@repo/contracts";

// Синтетические данные: одинаковый ответ для любого ИНН.

export function egrul(inn: string): EgrulRecord {
  return {
    inn,
    ogrn: "1027700132195",
    name: "ООО «Ромашка»",
    status: "Действующее",
    registeredAt: "2015-03-12",
    okved: "47.11",
  };
}

export function bki(inn: string): BkiReport {
  return { inn, activeLoans: 1, totalDebtRub: 450_000, overdueDays: 0 };
}

export function fns(inn: string): FnsProfile {
  return {
    inn,
    taxDebtRub: 0,
    employees: 12,
    massRegistrationAddress: false,
  };
}
