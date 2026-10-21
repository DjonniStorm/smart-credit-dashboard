import { Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";

import { ProductPicker } from "@/features/pick-product";
import { tx } from "@/shared/i18n";

export const metadata: Metadata = { title: tx.products.title };

export default function ProductsPage() {
  return (
    <Stack gap="xl">
      <Stack gap={6}>
        <Title order={1}>{tx.products.title}</Title>
        <Text maw={640}>{tx.products.lead}</Text>
      </Stack>
      <ProductPicker />
    </Stack>
  );
}
