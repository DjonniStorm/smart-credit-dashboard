"use client";

import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

import { useSession } from "@/entities/session";
import { tx } from "@/shared/i18n";

/** Личный кабинет: пользователь и компания, ссылка на полный профиль. */
export function CabinetProfile() {
  const account = useSession().data;
  if (!account) {
    return null;
  }
  return (
    <Stack gap="lg">
      <Stack gap={6}>
        <Title order={1}>{tx.profile.title}</Title>
      </Stack>
      <Card>
        <Stack gap="xs" align="flex-start">
          <Title order={2} fz={16}>
            {tx.profile.accountTitle}
          </Title>
          <Stack gap={4}>
            <Text fw={600}>{account.person}</Text>
            <Text size="sm" c="dimmed">
              {account.role}
            </Text>
            <Text size="sm" c="dimmed">
              {account.company.name}
            </Text>
            <Text size="sm" c="dimmed">
              {tx.profile.inn(account.company.inn)}
            </Text>
          </Stack>
          <Group gap="xs" mt="xs">
            <Button component={Link} href="/company" variant="default">
              {tx.profile.companyLink}
            </Button>
            <Button component={Link} href="/settings" variant="default">
              {tx.account.settings}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
