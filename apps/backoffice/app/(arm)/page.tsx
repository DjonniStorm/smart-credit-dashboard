import { Suspense } from "react";

import { HealthStatusPending } from "@/entities/health";
import { HealthPanel } from "@/widgets/health-panel";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense fallback={<HealthStatusPending />}>
      <HealthPanel />
    </Suspense>
  );
}
