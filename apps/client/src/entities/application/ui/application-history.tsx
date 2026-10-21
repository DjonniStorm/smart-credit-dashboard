import { Text, Timeline, Title } from "@mantine/core";

import type { ApplicationEvent } from "@repo/contracts/cabinet";

import { formatDateTime, tx } from "@/shared/i18n";

const t = tx.application;

/** Лента событий заявки, новые сверху. */
export function ApplicationHistory({ events }: { events: ApplicationEvent[] }) {
  const sorted = [...events].reverse();
  return (
    <section aria-labelledby="history-title">
      <Title order={3} id="history-title" mb="sm">
        {t.history}
      </Title>
      <Timeline bulletSize={12} lineWidth={2} active={sorted.length - 1}>
        {sorted.map((e) => (
          <Timeline.Item key={`${e.at}-${e.text}`}>
            <Text size="sm">{e.text}</Text>
            <Text size="xs" c="dimmed">
              {t.actors[e.actor]}, {formatDateTime(e.at)}
            </Text>
          </Timeline.Item>
        ))}
      </Timeline>
    </section>
  );
}
