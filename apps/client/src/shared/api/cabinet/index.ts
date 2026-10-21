import { httpApi } from "./http";
import { mockApi } from "./mock";
import type { CabinetApi } from "./types";

/** Единственное место переключения: "mock" до готовности ручек api. */
const ADAPTER: "mock" | "http" = "mock";

export const cabinetApi: CabinetApi = ADAPTER === "mock" ? mockApi : httpApi;
export const isMockApi = ADAPTER === "mock";

export { resetMockState } from "./mock";
export { monthlyPayment } from "./decide";
export { ApiError, type CabinetApi } from "./types";
