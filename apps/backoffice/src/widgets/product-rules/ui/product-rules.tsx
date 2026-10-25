"use client";

import { Button, Card, List, Stack, Table, Text, Title } from "@mantine/core";

import { StateBlock } from "@repo/ui/state-block";

import { useProducts } from "@/entities/application";
import { formatRub } from "@/shared/lib/money";

// Описание соответствует синтетическому baseline scoring в API.
const FACTORS: [string, string][] = [
  ["Срок работы бизнеса", "от 3 лет +10, от 1 года +4, меньше года −8"],
  [
    "Просрочки по кредитам (БКИ)",
    "нет +12, до 30 дней −10, больше 30 дней −25",
  ],
  ["Действующие кредиты (БКИ)", "4 и больше −6"],
  [
    "Долг после выдачи к выручке",
    "меньше 30 % +8, до 60 % −4, больше 60 % −14",
  ],
  ["Налоговая задолженность (ФНС)", "нет +4, есть −10"],
  ["Адрес массовой регистрации (ФНС)", "да −8"],
  ["Сотрудники в штате (ФНС)", "5 и больше +4, ни одного −4"],
];

/** Справочник: продукты, их правила и как считается скоринг. */
export function ProductRules() {
  const products = useProducts();

  if (products.isPending) {
    return <StateBlock kind="loading" title="Загружаем продукты" />;
  }
  if (products.isError) {
    return (
      <StateBlock
        kind="error"
        title="Продукты не загрузились"
        action={
          <Button variant="default" onClick={() => void products.refetch()}>
            Повторить
          </Button>
        }
      >
        {products.error.message}
      </StateBlock>
    );
  }
  if (products.data.length === 0) {
    return (
      <StateBlock kind="empty" title="Продуктов нет">
        Добавьте продукт в api, и его правила появятся здесь.
      </StateBlock>
    );
  }

  return (
    <Stack gap="lg">
      <Card>
        <Stack gap="md">
          <Title order={3}>Продукты</Title>
          <Text size="sm" c="dimmed">
            Условия синтетические, для демонстрации. Правила продукта
            применяются к заявке после скоринга.
          </Text>
          <div style={{ overflowX: "auto" }}>
            <Table miw={980} aria-label="Продукты и правила">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Продукт</Table.Th>
                  <Table.Th>Сумма</Table.Th>
                  <Table.Th>Срок</Table.Th>
                  <Table.Th>Ставка</Table.Th>
                  <Table.Th>Мин. балл</Table.Th>
                  <Table.Th>Долг к выручке</Table.Th>
                  <Table.Th>Возраст бизнеса</Table.Th>
                  <Table.Th>Обеспечение</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody style={{ fontVariantNumeric: "tabular-nums" }}>
                {products.data.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {p.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {p.description}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {formatRub(p.minAmount)} – {formatRub(p.maxAmount)}
                    </Table.Td>
                    <Table.Td>
                      {p.minTermMonths}–{p.maxTermMonths} мес.
                    </Table.Td>
                    <Table.Td>
                      от {p.ratePct} %
                    </Table.Td>
                    <Table.Td>{p.minScore}</Table.Td>
                    <Table.Td>до {Math.round(p.maxDebtLoad * 100)} %</Table.Td>
                    <Table.Td>от {p.minBusinessAgeMonths} мес.</Table.Td>
                    <Table.Td>{p.collateral ?? "Не требуется"}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <Title order={3}>Как считается скоринг</Title>
          <Text size="sm">
            Балльная модель на правилах. Старт с 50 баллов, каждый признак
            добавляет или отнимает баллы, итог от 0 до 100. Выше балл, ниже
            риск.
          </Text>
          <Table aria-label="Признаки скоринга">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Признак</Table.Th>
                <Table.Th>Влияние на балл</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {FACTORS.map(([name, effect]) => (
                <Table.Tr key={name}>
                  <Table.Td>{name}</Table.Td>
                  <Table.Td>{effect}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Card>

      <Card>
        <Stack gap="md">
          <Title order={3}>Как рекомендация становится решением</Title>
          <List spacing="xs" size="sm">
            <List.Item>
              Компания не действует, бизнес моложе порога продукта, просрочка
              больше 30 дней или балл ниже порога на 10 и больше: рекомендован
              отказ.
            </List.Item>
            <List.Item>
              Есть налоговая задолженность: запросить справку об уплате.
            </List.Item>
            <List.Item>
              Нагрузка выше предела, балл чуть ниже порога или сумма вне границ:
              встречное предложение. Сумма снижается до предела нагрузки, при
              балле в серой зоне ставка выше на 2 п.п.
            </List.Item>
            <List.Item>Иначе одобрить на условиях клиента.</List.Item>
            <List.Item>
              Решение принимает сотрудник. Аналитик одобряет до 5 млн ₽, больше:
              руководитель андеррайтинга.
            </List.Item>
          </List>
        </Stack>
      </Card>
    </Stack>
  );
}
