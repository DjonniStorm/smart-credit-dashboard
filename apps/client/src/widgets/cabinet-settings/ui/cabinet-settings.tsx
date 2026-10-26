"use client";

import { Button, Card, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";

import { ThemeSelector } from "@repo/ui/theme-selector";

import { useSession, useSignOut } from "@/entities/session";
import { tx } from "@/shared/i18n";

import classes from "./cabinet-settings.module.css";

/** Настройки кабинета: учётка и тема. */
export function CabinetSettings() {
  const account = useSession().data;
  const router = useRouter();
  const signOut = useSignOut();
  if (!account) {
    return null;
  }
  return (
    <Stack gap="lg">
      <Title order={1}>{tx.settings.title}</Title>
      <div className={classes.grid}>
        <Card>
          <Stack gap="xs" align="flex-start">
            <Title order={2} fz={16}>
              {tx.settings.accountTitle}
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
            <Button
              variant="default"
              mt="xs"
              onClick={() =>
                signOut.mutate(undefined, {
                  onSuccess: () => router.replace("/login"),
                })
              }
            >
              {tx.settings.switchAccount}
            </Button>
          </Stack>
        </Card>
        <Card>
          <Stack gap="xs" align="flex-start">
            <Title order={2} fz={16} id="theme-title">
              {tx.theme.title}
            </Title>
            <ThemeSelector
              labelId="theme-title"
              labels={{
                light: tx.theme.light,
                dark: tx.theme.dark,
                auto: tx.theme.auto,
              }}
            />
          </Stack>
        </Card>
      </div>
    </Stack>
  );
}
