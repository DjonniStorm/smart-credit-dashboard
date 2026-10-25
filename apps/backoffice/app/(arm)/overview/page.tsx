import type { Metadata } from "next";
import { Suspense } from "react";

import { Page } from "@/shared/ui/page";
import { Overview } from "@/widgets/overview";

export const metadata: Metadata = { title: "Обзор" };

export default function OverviewPage() {
  return (
    <Page title="Обзор" subtitle="Движение заявок по конвейеру">
      <Suspense fallback={null}>
        <Overview />
      </Suspense>
    </Page>
  );
}
