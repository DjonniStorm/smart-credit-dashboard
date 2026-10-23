import { httpApi } from "./http";
import type { CabinetApi } from "./types";

export const cabinetApi: CabinetApi = httpApi;

export { ApiError, type CabinetApi } from "./types";
