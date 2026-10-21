import { httpArmApi } from "./http-api";
import { mockArmApi } from "./mock/mock-api";
import type { ArmApi } from "./types";

/**
 * Единственное место выбора бэкенда АРМ.
 * NEXT_PUBLIC_ARM_API=http: ручки Nest через /api. Иначе мок в браузере.
 */
export const armApiMode: "mock" | "http" =
  process.env.NEXT_PUBLIC_ARM_API === "http" ? "http" : "mock";

export const armApi: ArmApi = armApiMode === "http" ? httpArmApi : mockArmApi;

export { ArmActionError, rejectReasonLabel } from "./mock/flow";
export type { ArmApi } from "./types";
export { armKeys } from "./keys";
