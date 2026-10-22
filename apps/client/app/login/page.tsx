import { Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";

import { DemoSignIn } from "@/features/sign-in";
import { tx } from "@/shared/i18n";
import { CabinetLogo } from "@/widgets/cabinet-shell";

import classes from "./login.module.css";

export const metadata: Metadata = { title: tx.login.title };

export default function LoginPage() {
  return (
    <div className={classes.page}>
      <header className={classes.header}>
        <CabinetLogo href="/login" />
      </header>
      <main className={classes.main}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={1}>{tx.login.title}</Title>
            <Text c="dimmed" maw={620}>
              {tx.login.lead}
            </Text>
          </Stack>
          <DemoSignIn />
          <Text size="xs" c="dimmed">
            {tx.demo.footer}
          </Text>
        </Stack>
      </main>
    </div>
  );
}
