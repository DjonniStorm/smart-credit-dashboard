"use client";

import { Button, Card, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

import { backofficeText, i18n } from "@repo/i18n";

import { roleLabel, useSignedInEmployee } from "@/entities/employee";
import { formatRub } from "@/shared/lib/money";

const bx = backofficeText(i18n.defaultLocale);

/** Личный кабинет сотрудника: учётка и переход в настройки. */
export function Profile() {
  const employee = useSignedInEmployee();
  return (
    <Card>
      <Stack gap="xs" align="flex-start">
        <Title order={2} fz={16}>
          {bx.profile.accountTitle}
        </Title>
        <Text fw={600}>{employee.name}</Text>
        <Text size="sm" c="dimmed">
          {bx.profile.roleAndLimit(
            roleLabel[employee.role],
            formatRub(employee.approvalLimit),
          )}
        </Text>
        <Button component={Link} href="/settings" variant="default" mt="xs">
          {bx.profile.settingsLink}
        </Button>
      </Stack>
    </Card>
  );
}
