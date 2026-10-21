import { Stack, Title } from "@mantine/core";
import type { Metadata } from "next";

import { QueueBoard } from "@/widgets/queue-board";

export const metadata: Metadata = { title: "Очередь заявок" };

export default function QueuePage() {
  return (
    <Stack gap="md">
      <Title order={1}>Очередь заявок</Title>
      <QueueBoard />
    </Stack>
  );
}
