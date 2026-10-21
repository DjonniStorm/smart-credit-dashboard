import { Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";

import { ProductRules } from "@/widgets/product-rules";

export const metadata: Metadata = { title: "Продукты и правила" };

export default function ProductsPage() {
  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={1}>Продукты и правила</Title>
        <Text c="dimmed">
          По этим правилам система готовит рекомендацию, а сотрудник принимает
          решение.
        </Text>
      </Stack>
      <ProductRules />
    </Stack>
  );
}
