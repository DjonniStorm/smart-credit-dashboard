import { Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";

import { JournalTable } from "@/widgets/journal";

export const metadata: Metadata = { title: "Журнал действий" };

export default function JournalPage() {
  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={1}>Журнал действий</Title>
        <Text c="dimmed">
          Все изменения заявок: действия сотрудников, конвейера и клиентов.
        </Text>
      </Stack>
      <JournalTable />
    </Stack>
  );
}
