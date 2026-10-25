"use client";

import { Button, Card, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";

import { backofficeText, i18n } from "@repo/i18n";
import { ThemeSelector } from "@repo/ui/theme-selector";

import { roleLabel, signOut, useSignedInEmployee } from "@/entities/employee";
import { formatRub } from "@/shared/lib/money";

import { AutonomyPolicySettings } from "./autonomy-policy-settings";
import classes from "./settings.module.css";

const bx = backofficeText(i18n.defaultLocale);

/** Настройки сотрудника: учётка, тема, автономия. */
export function Settings() {
  const employee = useSignedInEmployee();
  const router = useRouter();

  return (
    <div className={classes.grid}>
      <Card>
        <Stack gap="xs" align="flex-start">
          <Title order={2} fz={16}>
            {bx.settings.accountTitle}
          </Title>
          <Text fw={600}>{employee.name}</Text>
          <Text size="sm" c="dimmed">
            {bx.profile.roleAndLimit(
              roleLabel[employee.role],
              formatRub(employee.approvalLimit),
            )}
          </Text>
          <Button
            variant="default"
            mt="xs"
            onClick={() => {
              signOut();
              router.replace("/login");
            }}
          >
            {bx.settings.switchAccount}
          </Button>
        </Stack>
      </Card>

      <Card>
        <Stack gap="xs" align="flex-start">
          <Title order={2} fz={16} id="theme-title">
            {bx.theme.title}
          </Title>
          <ThemeSelector
            labelId="theme-title"
            labels={{
              light: bx.theme.light,
              dark: bx.theme.dark,
              auto: bx.theme.auto,
            }}
          />
        </Stack>
      </Card>

      <AutonomyPolicySettings />
    </div>
  );
}
