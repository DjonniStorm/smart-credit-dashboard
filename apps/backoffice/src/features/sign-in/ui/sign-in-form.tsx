"use client";

import { Button, Card, Group, Radio, Stack, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Message, i18n, t } from "@repo/i18n";
import { StateBlock } from "@repo/ui/state-block";

import { roleLabel, signIn, useEmployees } from "@/entities/employee";
import { formatRub } from "@/shared/lib/money";

/**
 * Вход по демо-учётке без пароля: в прототипе роль важнее подлинности.
 * Роль задаёт лимит одобрения, поэтому крупные заявки решает руководитель.
 */
export function SignInForm() {
  const employees = useEmployees();
  const router = useRouter();
  const [choice, setChoice] = useState<string | null>(null);
  const selected = choice ?? employees.data?.[0]?.id ?? null;

  return (
    <Card maw={460} w="100%" mx="auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!selected) return;
          signIn(selected);
          router.replace("/");
        }}
      >
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1} fz={24}>
              {t(i18n.defaultLocale, Message.ArmTitle)}
            </Title>
            <Text c="dimmed">
              Выберите демо-учётку. Пароля нет: это прототип на синтетических
              данных.
            </Text>
          </Stack>

          {employees.isPending ? (
            <StateBlock kind="loading" title="Загружаем учётки" />
          ) : employees.isError ? (
            <StateBlock
              kind="error"
              title="Учётки не загрузились"
              action={
                <Button
                  variant="default"
                  onClick={() => void employees.refetch()}
                >
                  Повторить
                </Button>
              }
            >
              {employees.error.message}
            </StateBlock>
          ) : employees.data.length === 0 ? (
            <StateBlock kind="empty" title="Учёток нет">
              Добавьте сотрудников в api, чтобы войти.
            </StateBlock>
          ) : (
            <Radio.Group
              label="Учётная запись"
              value={selected}
              onChange={setChoice}
            >
              <Stack gap="xs" mt="xs">
                {employees.data.map((e) => (
                  <Radio.Card
                    key={e.id}
                    value={e.id}
                    p="sm"
                    radius="md"
                    style={{ borderColor: "var(--kk-line)" }}
                  >
                    <Group gap="sm" wrap="nowrap" align="flex-start">
                      <Radio.Indicator mt={2} />
                      <Stack gap={0}>
                        <Text fw={600}>{e.name}</Text>
                        <Text size="sm" c="dimmed">
                          {roleLabel[e.role]}, одобряет до{" "}
                          {formatRub(e.approvalLimit)}
                        </Text>
                      </Stack>
                    </Group>
                  </Radio.Card>
                ))}
              </Stack>
            </Radio.Group>
          )}

          <Button type="submit" disabled={!selected}>
            Войти
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
