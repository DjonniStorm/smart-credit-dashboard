import { Group, Stack, Text, Timeline } from "@mantine/core";
import { IconRoute, IconUser, IconUserCheck } from "@tabler/icons-react";

import type { ApplicationEvent } from "@repo/contracts/application";
import { StateBlock } from "@repo/ui/state-block";

import { formatDateTime } from "../model/format";
import { statusLabel } from "../model/labels";

const actorIcon = {
  system: IconRoute,
  employee: IconUserCheck,
  client: IconUser,
};

const actorKind = {
  system: "Конвейер",
  employee: "Сотрудник",
  client: "Клиент",
};

/** История заявки: кто, когда и что сделал. Новые сверху. */
export function EventTimeline({ events }: { events: ApplicationEvent[] }) {
  if (events.length === 0) {
    return (
      <StateBlock kind="empty" title="Событий пока нет">
        Здесь появятся действия конвейера, сотрудников и клиента.
      </StateBlock>
    );
  }
  const list = [...events].reverse();
  return (
    <Timeline bulletSize={26} lineWidth={2} color="primary">
      {list.map((e) => {
        const Icon = actorIcon[e.actor.kind];
        return (
          <Timeline.Item
            key={e.id}
            bullet={<Icon size={14} stroke={1.75} aria-hidden />}
            title={e.title}
          >
            <Stack gap={2}>
              {e.comment && <Text size="sm">{e.comment}</Text>}
              {e.toStatus && (
                <Text size="sm" c="dimmed">
                  Статус:{" "}
                  {e.fromStatus ? `${statusLabel[e.fromStatus]} → ` : ""}
                  {statusLabel[e.toStatus]}
                </Text>
              )}
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {formatDateTime(e.at)}
                </Text>
                <Text size="xs" c="dimmed">
                  {actorKind[e.actor.kind]}: {e.actor.name}
                </Text>
              </Group>
            </Stack>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
