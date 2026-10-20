import { Suspense } from "react";

import { CompanyCheckPending } from "@/entities/company";
import { CompanyCheckPanel } from "@/widgets/company-check-panel";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ inn?: string }>;
}) {
  const { inn } = await searchParams;

  if (!inn) {
    return null;
  }

  return (
    <Suspense fallback={<CompanyCheckPending />}>
      <CompanyCheckPanel inn={inn} />
    </Suspense>
  );
}
