import { Badge, Card, Group, List, Stack, Text, Timeline } from "@mantine/core";
import { IconRoute, IconUser, IconUserCheck } from "@tabler/icons-react";

import type { ApplicationComment, ApplicationEvent, ApplicationHandoff } from "@repo/contracts/application";
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
export function EventTimeline({
  events,
  comments = [],
  handoff = null,
}: {
  events: ApplicationEvent[];
  comments?: ApplicationComment[];
  handoff?: ApplicationHandoff | null;
}) {
  if (events.length === 0 && comments.length === 0 && !handoff) {
    return (
      <StateBlock kind="empty" title="Событий пока нет">
        Здесь появятся действия конвейера, сотрудников и клиента.
      </StateBlock>
    );
  }
  const list = [...events].reverse();
  return (
    <Stack gap="md">
      {handoff && (
        <Card withBorder padding="sm" radius="md" bg="var(--kk-surface-sunken)">
          <Group justify="space-between" align="flex-start" mb={4}>
            <Text size="sm" fw={700}>Последняя передача</Text>
            <Badge variant="light" color="blue">Передача</Badge>
          </Group>
          <Text size="sm">{handoff.summary}</Text>
          <Text size="xs" c="dimmed" mt={4}>Следующий шаг: {handoff.nextStep}</Text>
          {handoff.verifiedFacts.length > 0 && <List size="xs" mt="xs" withPadding><List.Item>Проверено: {handoff.verifiedFacts.join(" · ")}</List.Item></List>}
          {handoff.openQuestions.length > 0 && <List size="xs" mt="xs" withPadding><List.Item>Открытые вопросы: {handoff.openQuestions.join(" · ")}</List.Item></List>}
          <Text size="xs" c="dimmed" mt="xs">Получатель: {handoff.toEmployeeId}</Text>
        </Card>
      )}
      {comments.length > 0 && (
        <Stack gap="xs">
          <Text size="sm" fw={700}>Комментарии</Text>
          {[...comments].reverse().map((comment) => (
            <Card key={comment.id} withBorder padding="sm" radius="md">
              <Group justify="space-between" align="flex-start" gap="xs">
                <Text size="sm">{comment.body}</Text>
                <Badge size="xs" variant="light" color={comment.visibility === "client" ? "green" : comment.visibility === "handoff" ? "blue" : "gray"}>
                  {comment.visibility === "client" ? "Клиенту" : comment.visibility === "handoff" ? "Передача" : "Внутренний"}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>{formatDateTime(comment.at)} · {comment.author.name}</Text>
            </Card>
          ))}
        </Stack>
      )}
      <Text size="sm" fw={700}>События</Text>
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
    </Stack>
  );
}
