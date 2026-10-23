import { Group, Stack, Text } from "@mantine/core";

import type { Application } from "@repo/contracts/application";
import { backofficeText, i18n } from "@repo/i18n";

import { formatDateTimeFull } from "@/entities/application";

/** Срочность в карточке: действующий режим, запрос клиента и итог решения по нему. */
export function UrgentNote({ app }: { app: Application }) {
  const tx = backofficeText(i18n.defaultLocale).urgent;
  const request = app.urgentRequest;
  if (!app.urgent && !request) {
    return null;
  }
  return (
    <Stack gap={4} data-testid="urgent-note">
      {app.urgent && (
        <Group gap="xs" wrap="wrap">
          <Text size="sm" fw={600} c="orange">
            {tx.badge}
          </Text>
          {app.urgentSource && (
            <Text size="sm" c="dimmed">
              {app.urgentSource.by === "client" ? tx.byClient : tx.byEmployee}
            </Text>
          )}
          {app.urgentReason && (
            <Text size="sm">
              {tx.reason}: {app.urgentReason}
            </Text>
          )}
        </Group>
      )}
      {request?.state === "pending" && (
        <Text size="sm">
          {tx.requestTitle}: {request.reason}
        </Text>
      )}
      {request?.state === "accepted" && request.resolvedBy && (
        <Text size="sm" c="dimmed">
          {tx.accepted}.{" "}
          {tx.decidedBy(
            request.resolvedBy.name,
            formatDateTimeFull(request.resolvedAt ?? request.requestedAt),
          )}
        </Text>
      )}
      {request?.state === "declined" && request.resolvedBy && (
        <Text size="sm" c="dimmed">
          {tx.declined}: {request.declineReason}.{" "}
          {tx.decidedBy(
            request.resolvedBy.name,
            formatDateTimeFull(request.resolvedAt ?? request.requestedAt),
          )}
        </Text>
      )}
    </Stack>
  );
}
