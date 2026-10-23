"use client";

import {
  Button,
  Card,
  type MantineColorScheme,
  SegmentedControl,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";

import { useResetDemo } from "@/entities/application";
import { roleLabel, signOut, useSignedInEmployee } from "@/entities/employee";
import { armApiMode } from "@/shared/api/arm";
import { formatRub } from "@/shared/lib/money";

import classes from "./settings.module.css";

/** Настройки сотрудника: учётка, тема, сброс демо-данных. */
export function Settings() {
  const employee = useSignedInEmployee();
  const router = useRouter();
  const reset = useResetDemo();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <div className={classes.grid}>
      <Card>
        <Stack gap="xs" align="flex-start">
          <Title order={2} fz={16}>
            Учётная запись
          </Title>
          <Text fw={600}>{employee.name}</Text>
          <Text size="sm" c="dimmed">
            {roleLabel[employee.role]}, одобряет до{" "}
            {formatRub(employee.approvalLimit)}
          </Text>
          <Button
            variant="default"
            mt="xs"
            onClick={() => {
              signOut();
              router.replace("/login");
            }}
          >
            Сменить учётную запись
          </Button>
        </Stack>
      </Card>

      <Card>
        <Stack gap="xs" align="flex-start">
          <Title order={2} fz={16} id="theme-title">
            Тема
          </Title>
          <SegmentedControl
            aria-labelledby="theme-title"
            value={colorScheme}
            onChange={(v) => setColorScheme(v as MantineColorScheme)}
            data={[
              { value: "light", label: "Светлая" },
              { value: "dark", label: "Тёмная" },
              { value: "auto", label: "Как в системе" },
            ]}
          />
        </Stack>
      </Card>

      {armApiMode === "mock" && (
        <Card>
          <Stack gap="xs" align="flex-start">
            <Title order={2} fz={16}>
              Демо-данные
            </Title>
            <Text size="sm" c="dimmed">
              Заявки синтетические и хранятся в этом браузере. Сброс вернёт их к
              начальным этапам и очистит журнал.
            </Text>
            <Button
              variant="default"
              mt="xs"
              loading={reset.isPending}
              onClick={() =>
                reset.mutate(undefined, {
                  onSuccess: () =>
                    notifications.show({
                      message: "Демо-данные вернулись к началу",
                      withBorder: true,
                    }),
                })
              }
            >
              Вернуть демо-данные к началу
            </Button>
            {reset.error && (
              <Text size="sm" c="var(--kk-danger)" role="alert">
                {reset.error.message}
              </Text>
            )}
          </Stack>
        </Card>
      )}
    </div>
  );
}
