"use client";

import { Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";

import { StateBlock } from "@repo/ui/state-block";

import { useDemoAccounts, useSignIn } from "@/entities/session";
import { tx } from "@/shared/i18n";
import { QueryError } from "@/shared/ui/query-state";

const t = tx.login;

/** Вход по демо-учётке действующего клиента. */
export function DemoSignIn() {
  const router = useRouter();
  const accounts = useDemoAccounts();
  const signIn = useSignIn();

  if (accounts.isPending) {
    return <StateBlock kind="loading" title={t.loading} />;
  }
  if (accounts.isError) {
    return (
      <QueryError error={accounts.error} onRetry={() => accounts.refetch()} />
    );
  }

  return (
    <Stack gap="md" component="ul" p={0} m={0} style={{ listStyle: "none" }}>
      {accounts.data.map((a) => (
        <Paper component="li" key={a.id} withBorder p="lg" radius="lg">
          <Group justify="space-between" align="flex-start" gap="lg">
            <Stack gap={4} maw={520}>
              <Title order={3}>{a.company.name}</Title>
              <Text size="sm" c="dimmed">
                {t.inn(a.company.inn)} · {a.person}, {a.role.toLowerCase()}
              </Text>
              <Text size="sm" mt="xs">
                <Text span fw={500}>
                  {t.scenario}:{" "}
                </Text>
                {a.scenario}
              </Text>
            </Stack>
            <Button
              variant="default"
              loading={signIn.isPending && signIn.variables === a.id}
              disabled={signIn.isPending && signIn.variables !== a.id}
              onClick={() =>
                signIn.mutate(a.id, { onSuccess: () => router.push("/") })
              }
            >
              {t.signInAs(a.person)}
            </Button>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
