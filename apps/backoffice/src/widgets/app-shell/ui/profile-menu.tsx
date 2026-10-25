"use client";

import {
  Avatar,
  Group,
  Menu,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Employee } from "@repo/contracts/application";
import { backofficeText, i18n } from "@repo/i18n";

import { roleLabel, signOut } from "@/entities/employee";
import { formatRub } from "@/shared/lib/money";

import classes from "./arm-shell.module.css";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

const bx = backofficeText(i18n.defaultLocale);

export function ProfileMenu({ employee }: { employee: Employee }) {
  const router = useRouter();
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <UnstyledButton
          className={classes.profile}
          aria-label={`${employee.name}, ${roleLabel[employee.role]}. Меню сотрудника`}
        >
          <Group gap={10} wrap="nowrap">
            <Avatar size={32} radius="xl" color="gray" variant="light">
              {initials(employee.name)}
            </Avatar>
            <Stack gap={0} visibleFrom="md">
              <Text size="sm" fw={600} lh="18px">
                {employee.name}
              </Text>
              <Text size="xs" c="dimmed" lh="16px">
                {roleLabel[employee.role]}
              </Text>
            </Stack>
            <IconChevronDown size={16} stroke={1.5} aria-hidden />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          {bx.profile.approvalLimit(formatRub(employee.approvalLimit))}
        </Menu.Label>
        <Menu.Item component={Link} href="/profile">
          {bx.profile.title}
        </Menu.Item>
        <Menu.Item component={Link} href="/settings">
          {bx.settings.title}
        </Menu.Item>
        <Menu.Item
          onClick={() => {
            signOut();
            router.replace("/login");
          }}
        >
          {bx.settings.switchAccount}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
