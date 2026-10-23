import { httpArmApi } from "./http-api";
import type { ArmApi } from "./types";

export const armApi: ArmApi = httpArmApi;

export { rejectReasonLabel } from "./labels";
export type { ArmApi } from "./types";
export { armKeys } from "./keys";
