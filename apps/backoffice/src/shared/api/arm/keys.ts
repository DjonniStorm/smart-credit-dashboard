export const armKeys = {
  all: ["arm"] as const,
  applications: () => [...armKeys.all, "applications"] as const,
  application: (id: string) => [...armKeys.all, "application", id] as const,
  products: () => [...armKeys.all, "products"] as const,
  employees: () => [...armKeys.all, "employees"] as const,
};
