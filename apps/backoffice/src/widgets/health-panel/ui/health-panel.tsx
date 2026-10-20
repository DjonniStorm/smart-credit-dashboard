import { HealthStatus } from "@/entities/health";
import { getHealth } from "@/entities/health/api/get-health";

export async function HealthPanel() {
  const health = await getHealth();
  return <HealthStatus health={health} />;
}
