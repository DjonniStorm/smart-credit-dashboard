"use client";

import {
  Button,
  Card,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { useState } from "react";

import type { ApiAutonomySnapshot } from "@repo/contracts/api";
import { backofficeText, i18n } from "@repo/i18n";

import {
  useAutonomyAudit,
  useAutonomyPolicies,
  useAutonomyPolicyAction,
} from "@/entities/application";
import { useSignedInEmployee } from "@/entities/employee";

export function AutonomyPolicySettings() {
  const tx = backofficeText(i18n.defaultLocale);
  const employee = useSignedInEmployee();
  const policies = useAutonomyPolicies();
  const action = useAutonomyPolicyAction();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<"pause" | "set_level">(
    "pause",
  );
  const [selectedLevel, setSelectedLevel] = useState<"verified" | "stable">(
    "verified",
  );
  const [reason, setReason] = useState("");

  function closeDialog() {
    setSelectedProduct(null);
    setReason("");
    action.reset();
  }

  function submit() {
    const policy = policies.data?.find(
      (item) => item.config.productId === selectedProduct,
    );
    if (!policy || !reason.trim()) {
      return;
    }
    action.mutate(
      {
        productId: policy.config.productId,
        request: {
          action:
            selectedAction === "pause"
              ? { type: "pause", reason: reason.trim() }
              : {
                  type: "set_level",
                  level: selectedLevel,
                  reason: reason.trim(),
                },
          idempotencyKey: crypto.randomUUID(),
          expectedRevision: policy.config.revision,
        },
      },
      {
        onSuccess: closeDialog,
      },
    );
  }

  return (
    <Card>
      <Stack gap="md">
        <Title order={2} fz={16}>
          {tx.autonomy.title}
        </Title>
        {policies.isPending && <Text size="sm">{tx.application.loading}</Text>}
        {policies.isError && (
          <Text size="sm" c="red">
            {policies.error.message}
          </Text>
        )}
        {policies.data?.length === 0 && (
          <Text size="sm">{tx.autonomy.empty}</Text>
        )}
        {policies.data?.map((snapshot) => (
          <AutonomyPolicyCard
            key={snapshot.config.productId}
            snapshot={snapshot}
            canManage={employee.role === "lead"}
            onAction={(productId, nextAction, nextLevel) => {
              setSelectedProduct(productId);
              setSelectedAction(nextAction);
              setSelectedLevel(nextLevel ?? "verified");
            }}
          />
        ))}
      </Stack>
      <Modal
        opened={selectedProduct !== null}
        onClose={closeDialog}
        title={tx.autonomy.reasonTitle}
      >
        <Stack gap="md">
          <Textarea
            label={tx.autonomy.reasonTitle}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            placeholder={tx.autonomy.reasonPlaceholder}
            required
            autosize
            minRows={3}
          />
          {action.error && (
            <Text size="sm" c="red">
              {action.error.message}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDialog}>
              {tx.autonomy.cancel}
            </Button>
            <Button loading={action.isPending} onClick={submit}>
              {tx.autonomy.confirm}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}

function AutonomyPolicyCard({
  snapshot,
  canManage,
  onAction,
}: {
  snapshot: ApiAutonomySnapshot;
  canManage: boolean;
  onAction: (
    productId: string,
    action: "pause" | "set_level",
    level?: "verified" | "stable",
  ) => void;
}) {
  const tx = backofficeText(i18n.defaultLocale);
  const audit = useAutonomyAudit(snapshot.config.productId);
  return (
    <Card withBorder padding="sm">
      <Stack gap={4}>
        <Text fw={700}>{snapshot.config.productId}</Text>
        <Text size="sm">
          {tx.autonomy.level}: {tx.autonomy.levelLabel(snapshot.config.level)}
        </Text>
        <Text size="xs" c="dimmed">
          {tx.autonomy.cases(
            snapshot.metrics.closedCases,
            snapshot.metrics.eligibleCases,
          )}{" "}
          · {tx.autonomy.controlWindow(snapshot.config.controlWindowMinutes)}
        </Text>
        <Text size="xs" c="dimmed">
          {tx.autonomy.overrides(
            snapshot.metrics.manualOverrides,
            `${Math.round(snapshot.metrics.manualOverrideRate * 100)}%`,
          )}
        </Text>
        <Text size="xs" c="dimmed">
          {tx.autonomy.calibration}:{" "}
          {snapshot.metrics.calibrationStatus === "available"
            ? `${snapshot.metrics.calibrationError * 100}%`
            : tx.autonomy.noData}
          ; {tx.autonomy.drift}:{" "}
          {tx.autonomy.driftLabel(snapshot.metrics.driftStatus)}
        </Text>
        {audit.data?.slice(0, 3).map((entry) => (
          <Text key={entry.idempotencyKey} size="xs" c="dimmed">
            {tx.autonomy.auditEntry(entry.action, entry.reason)}
          </Text>
        ))}
        {canManage && (
          <Group gap="xs" mt="xs">
            <Button
              size="xs"
              variant="default"
              disabled={snapshot.config.level === "paused"}
              onClick={() => onAction(snapshot.config.productId, "pause")}
            >
              {tx.autonomy.pause}
            </Button>
            <Button
              size="xs"
              variant="default"
              disabled={snapshot.config.level === "verified"}
              onClick={() => onAction(snapshot.config.productId, "set_level")}
            >
              {tx.autonomy.strict}
            </Button>
            <Button
              size="xs"
              variant="default"
              disabled={snapshot.config.level === "stable"}
              onClick={() => {
                onAction(snapshot.config.productId, "set_level", "stable");
              }}
            >
              {tx.autonomy.stable}
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
