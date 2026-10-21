import { Stack, Title } from "@mantine/core";
import type { Metadata } from "next";
import { Suspense } from "react";

import { NewApplication } from "@/features/create-application";
import { tx } from "@/shared/i18n";

export const metadata: Metadata = { title: tx.wizard.title };

export default function NewApplicationPage() {
  return (
    <Stack gap="xl">
      <Title order={1}>{tx.wizard.title}</Title>
      <Suspense>
        <NewApplication />
      </Suspense>
    </Stack>
  );
}
