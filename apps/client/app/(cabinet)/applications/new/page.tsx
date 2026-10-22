import type { Metadata } from "next";
import { Suspense } from "react";

import { NewApplication } from "@/features/create-application";
import { tx } from "@/shared/i18n";

export const metadata: Metadata = { title: tx.wizard.title };

export default function NewApplicationPage() {
  return (
    <Suspense>
      <NewApplication />
    </Suspense>
  );
}
