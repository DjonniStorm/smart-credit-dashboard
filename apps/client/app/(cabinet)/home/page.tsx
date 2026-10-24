import type { Metadata } from "next";

import { fx } from "@/shared/i18n";
import { FinancingDashboard } from "@/widgets/financing-dashboard";

export const metadata: Metadata = { title: fx.title };

export default function HomePage() {
  return <FinancingDashboard />;
}
