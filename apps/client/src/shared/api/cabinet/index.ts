import { httpApi } from "./http";
import { mockApi } from "./mock";
import type { CabinetApi } from "./types";

/**
 * HTTP является режимом по умолчанию. Мок можно включить только явно для
 * storybook/локальных UI-тестов: NEXT_PUBLIC_CABINET_API=mock.
 */
const ADAPTER: "mock" | "http" =
  process.env.NEXT_PUBLIC_CABINET_API === "mock" ? "mock" : "http";

export const cabinetApi: CabinetApi = ADAPTER === "mock" ? mockApi : httpApi;
export const isMockApi = ADAPTER === "mock";

export { resetMockState } from "./mock";
export { monthlyPayment } from "./decide";
export { ApiError, type CabinetApi } from "./types";
