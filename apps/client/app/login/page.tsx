import { Container, Stack, Text, Title } from "@mantine/core";
import type { Metadata } from "next";

import { ColorSchemeToggle } from "@repo/ui/color-scheme-toggle";

import { DemoSignIn } from "@/features/sign-in";
import { tx } from "@/shared/i18n";

export const metadata: Metadata = { title: tx.login.title };

export default function LoginPage() {
  return (
    <Container size="md" py={48}>
      <Stack gap="xl">
        <Stack gap="xs">
          <Text fw={600} c="dimmed">
            {tx.brand}
          </Text>
          <Title order={1}>{tx.login.title}</Title>
          <Text maw={620}>{tx.login.lead}</Text>
        </Stack>
        <DemoSignIn />
        <Text size="sm" c="dimmed">
          {tx.demo.footer}
        </Text>
        <div>
          <ColorSchemeToggle />
        </div>
      </Stack>
    </Container>
  );
}
