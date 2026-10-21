import type { EmployeeRole } from "@repo/contracts/application";

export const roleLabel: Record<EmployeeRole, string> = {
  analyst: "Кредитный аналитик",
  lead: "Руководитель андеррайтинга",
};
