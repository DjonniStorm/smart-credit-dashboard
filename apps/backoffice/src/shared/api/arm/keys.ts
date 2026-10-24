export const armKeys = {
  all: ["arm"] as const,
  applications: () => [...armKeys.all, "applications"] as const,
  application: (id: string) => [...armKeys.all, "application", id] as const,
  products: () => [...armKeys.all, "products"] as const,
  employees: () => [...armKeys.all, "employees"] as const,
  autonomyPolicies: () => [...armKeys.all, "autonomy-policies"] as const,
  autonomyPolicy: (productId: string) =>
    [...armKeys.autonomyPolicies(), productId] as const,
  autonomyAudit: (productId: string) =>
    [...armKeys.autonomyPolicy(productId), "audit"] as const,
  managerReport: (view: "overview" | "journal") =>
    [...armKeys.all, "manager-report", view] as const,
  managerReports: () => [...armKeys.all, "manager-report"] as const,
};
