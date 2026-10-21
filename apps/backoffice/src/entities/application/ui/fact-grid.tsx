import { SimpleGrid, Stack, Text } from "@mantine/core";
import { type ReactNode } from "react";

import classes from "./panel.module.css";

/** Сетка «подпись: значение» для данных клиента и заявки. */
export function FactGrid({
  facts,
  cols = 2,
}: {
  facts: { label: string; value: ReactNode }[];
  cols?: number;
}) {
  return (
    <SimpleGrid
      component="dl"
      cols={{ base: 1, xs: Math.min(cols, 2), md: cols }}
      spacing="md"
      verticalSpacing="sm"
      m={0}
    >
      {facts.map((f) => (
        <Stack key={f.label} gap={0}>
          <Text component="dt" size="sm" c="dimmed">
            {f.label}
          </Text>
          <Text component="dd" m={0} className={classes.num}>
            {f.value}
          </Text>
        </Stack>
      ))}
    </SimpleGrid>
  );
}
