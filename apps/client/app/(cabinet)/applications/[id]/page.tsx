import type { Metadata } from "next";

import { tx } from "@/shared/i18n";
import { ApplicationDetail } from "@/widgets/application-detail";

export const metadata: Metadata = {
  title: tx.application.pageTitle,
  robots: { index: false },
};

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApplicationDetail id={id} />;
}
