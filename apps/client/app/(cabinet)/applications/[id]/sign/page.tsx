import type { Metadata } from "next";

import { tx } from "@/shared/i18n";
import { ApplicationSigning } from "@/widgets/application-detail";

export const metadata: Metadata = {
  title: tx.sign.title,
  robots: { index: false },
};

export default async function SignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ApplicationSigning id={id} />;
}
