import type { RejectReason } from "@repo/contracts/application";

export const rejectReasonLabel: Record<RejectReason, string> = {
  company_inactive: "Компания не действует",
  bki_overdue: "Просрочка в БКИ",
  tax_debt: "Налоговая задолженность",
  debt_load: "Высокая долговая нагрузка",
  low_score: "Низкий балл",
  other: "Другая причина",
};
