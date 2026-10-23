"use client";

import {
  ActionIcon,
  Indicator,
  Popover,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Employee } from "@repo/contracts/application";

import { formatAge, useApplications } from "@/entities/application";
import { formatRub } from "@/shared/lib/money";

import classes from "./arm-shell.module.css";

/** Колокольчик: заявки, где ход за этим сотрудником (его или ничьи). */
export function InboxBell({ employee }: { employee: Employee }) {
  const apps = useApplications();
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const mine = (apps.data ?? []).filter(
    (a) =>
      a.waitingOn === "employee" &&
      (a.assigneeId === employee.id || a.assigneeId === null),
  );

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width={320}
      shadow="md"
    >
      <Popover.Target>
        <Indicator
          disabled={mine.length === 0}
          color="var(--kk-brand-bright)"
          size={8}
          offset={7}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size={40}
            onClick={() => setOpened((o) => !o)}
            aria-label={
              mine.length > 0
                ? `Ждут вашего решения: ${mine.length}`
                : "Уведомления"
            }
          >
            <IconBell size={20} stroke={1.5} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>
      <Popover.Dropdown p={0}>
        <Text fw={600} size="sm" px="md" pt="sm" pb="xs">
          Ждут вашего решения
        </Text>
        {mine.length === 0 ? (
          <Text size="sm" c="dimmed" px="md" pb="md">
            Заявок, где ход за вами, сейчас нет.
          </Text>
        ) : (
          <Stack gap={0} pb={4}>
            {mine.map((a) => (
              <UnstyledButton
                key={a.id}
                className={classes.inboxItem}
                onClick={() => {
                  setOpened(false);
                  router.push(`/?open=${a.id}`);
                }}
              >
                <Text size="sm" fw={500}>
                  № {a.number} · {a.applicant.name}
                </Text>
                <Text size="xs" c="dimmed">
                  {formatRub(a.request.amount)} · ждёт {formatAge(a.updatedAt)}
                </Text>
              </UnstyledButton>
            ))}
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  );
}
