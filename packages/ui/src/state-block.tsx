import { Group, Loader, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconFileText } from "@tabler/icons-react";
import { type JSX, type ReactNode } from "react";

export type StateKind = "empty" | "loading" | "error";

const surfaces: Record<StateKind, { bg: string; border: string }> = {
  empty: {
    bg: "var(--kk-surface)",
    border: "1px dashed var(--mantine-color-default-border)",
  },
  loading: {
    bg: "var(--kk-surface)",
    border: "1px dashed var(--mantine-color-default-border)",
  },
  error: { bg: "var(--kk-danger-soft)", border: "1px solid var(--kk-danger)" },
};

/**
 * Пустое, загрузочное и ошибочное состояние блока с данными.
 * Всегда причина словами и одно действие.
 */
export function StateBlock({
  kind,
  title,
  children,
  action,
}: {
  kind: StateKind;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}): JSX.Element {
  const { bg, border } = surfaces[kind];
  return (
    <Paper
      p="lg"
      radius="lg"
      style={{ background: bg, border }}
      role={kind === "error" ? "alert" : undefined}
      aria-busy={kind === "loading" || undefined}
    >
      <Stack gap="xs" align="flex-start">
        <Group gap="xs" c={kind === "error" ? "var(--kk-danger)" : undefined}>
          {kind === "loading" ? (
            <Loader size={18} color="var(--mantine-color-text)" />
          ) : kind === "error" ? (
            <IconAlertCircle size={20} stroke={1.75} aria-hidden />
          ) : (
            <IconFileText size={20} stroke={1.75} aria-hidden />
          )}
          <Text fw={600}>{title}</Text>
        </Group>
        {kind === "loading" ? (
          <Stack gap={8} w="100%">
            <Skeleton h={14} w="70%" />
            <Skeleton h={14} w="45%" />
          </Stack>
        ) : (
          children && (
            <Text c={kind === "error" ? undefined : "dimmed"}>{children}</Text>
          )
        )}
        {action}
      </Stack>
    </Paper>
  );
}
