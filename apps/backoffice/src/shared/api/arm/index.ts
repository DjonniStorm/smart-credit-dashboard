import { httpArmApi } from "./http-api";
import { mockArmApi } from "./mock/mock-api";
import type { ArmApi } from "./types";

/**
 * Единственное место выбора бэкенда АРМ.
 * NEXT_PUBLIC_ARM_API=mock: мок только для локальных UI-тестов. В рабочем
 * режиме используются ручки Nest через /api.
 */
export const armApiMode: "mock" | "http" =
  process.env.NEXT_PUBLIC_ARM_API === "mock" ? "mock" : "http";

export const armApi: ArmApi = armApiMode === "http" ? httpArmApi : mockArmApi;

export { ArmActionError, rejectReasonLabel } from "./mock/flow";
export type { ArmApi } from "./types";
export { armKeys } from "./keys";
