import type { HealthResponse, ServiceName } from "@repo/contracts";

export class HealthDto implements HealthResponse {
  status: "ok" | "degraded";
  service: ServiceName;
  checks: Record<string, "up" | "down">;
}
