"use client";

import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";

import type { Application } from "@repo/contracts/cabinet";

import { useSetUrgent } from "@/entities/application";
import { formatDateTime, tx } from "@/shared/i18n";
import { InlineError } from "@/shared/ui/query-state";

const t = tx.application.urgent;

/** Срочный режим по заявке: клиент просит, решение за менеджером. */
export function UrgentRequest({ app }: { app: Application }) {
  const setUrgent = useSetUrgent(app);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  if (app.status === "rejected" || app.status === "disbursed") {
    return null;
  }

  const request = app.urgentRequest;

  function send() {
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError(t.reasonRequired);
      return;
    }
    setReasonError(null);
    setUrgent.mutate({ enabled: true, reason: trimmed });
  }

  const failed = setUrgent.variables?.enabled ? t.enableError : t.withdrawError;

  return (
    <Card component="section" aria-labelledby="urgent-title">
      <Stack gap="md">
        <Title order={2} size="h3" id="urgent-title">
          {t.title}
        </Title>
        <Text size="sm" c="dimmed">
          {t.text}
        </Text>

        {request?.state === "pending" && (
          <Stack gap={6} aria-live="polite">
            <Text fw={600}>{t.pendingTitle}</Text>
            <Text size="sm">{t.pendingText}</Text>
            <Text size="sm" c="dimmed">
              {request.reason}
            </Text>
            <Text size="sm" c="dimmed">
              {t.requestedAt(formatDateTime(request.requestedAt))}
            </Text>
          </Stack>
        )}

        {request?.state === "accepted" && (
          <Stack gap={6} aria-live="polite">
            <Text fw={600}>{t.acceptedTitle}</Text>
            <Text size="sm">{t.acceptedText}</Text>
          </Stack>
        )}

        {request?.state === "declined" && (
          <Stack gap={6} aria-live="polite">
            <Text fw={600}>{t.declinedTitle}</Text>
            {request.declineReason && (
              <Text size="sm">{t.declineReason(request.declineReason)}</Text>
            )}
            <Text size="sm" c="dimmed">
              {t.declinedText}
            </Text>
          </Stack>
        )}

        {!request && app.urgentBy === "employee" && (
          <Stack gap={6} aria-live="polite">
            <Text fw={600}>{t.bankTitle}</Text>
            <Text size="sm" c="dimmed">
              {t.bankText}
            </Text>
          </Stack>
        )}

        {!request && app.urgentBy !== "employee" && (
          <TextInput
            label={t.reason}
            placeholder={t.reasonPlaceholder}
            value={reason}
            maxLength={500}
            error={reasonError}
            disabled={setUrgent.isPending}
            onChange={(event) => {
              setReason(event.currentTarget.value);
              setReasonError(null);
            }}
          />
        )}

        {setUrgent.error && (
          <InlineError>
            {failed}: {setUrgent.error.message}
          </InlineError>
        )}

        {request?.state === "pending" && (
          <Group gap="sm">
            <Button
              variant="default"
              loading={setUrgent.isPending}
              onClick={() => setUrgent.mutate({ enabled: false, reason: "" })}
            >
              {t.withdraw}
            </Button>
          </Group>
        )}

        {!request && app.urgentBy !== "employee" && (
          <Group gap="sm">
            <Button loading={setUrgent.isPending} onClick={send}>
              {t.enable}
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
