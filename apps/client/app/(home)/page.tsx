import type { Metadata } from "next";
import { Suspense } from "react";

import { Message, createTranslator, i18n } from "@repo/i18n";

import { CompanyCheckPending } from "@/entities/company";
import { CompanyCheckPanel } from "@/widgets/company-check-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ inn?: string }>;
}): Promise<Metadata> {
  const { inn } = await searchParams;
  const tr = createTranslator(i18n.defaultLocale);
  if (!inn) {
    return {
      title: tr(Message.CabinetCheckTitle),
      description: tr(Message.CabinetCheckDescription),
    };
  }
  return {
    title: tr(Message.CabinetCheckTitleInn, { inn }),
    description: tr(Message.CabinetCheckDescriptionInn, { inn }),
    robots: { index: false, follow: true },
  };
}

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
