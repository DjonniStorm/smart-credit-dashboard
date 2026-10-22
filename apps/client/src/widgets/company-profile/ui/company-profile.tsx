"use client";

import { Card, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { formatRub } from "@repo/ui/money";

import { useSession } from "@/entities/session";
import { formatDate, lx, tx } from "@/shared/i18n";

const t = lx.company;
const f = tx.wizard.companyFields;

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" component="dl" m={0}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <Text component="dt" size="sm" c="dimmed">
            {label}
          </Text>
          <Text
            component="dd"
            m={0}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {value}
          </Text>
        </div>
      ))}
    </SimpleGrid>
  );
}

/** Карточка компании из профиля: реестр, кто в кабинете, что банк знает по счёту. */
export function CompanyProfile() {
  const account = useSession().data;
  if (!account) return null;
  const c = account.company;
  const k = account.knownFinancials;

  return (
    <Stack gap="lg" maw={960}>
      <Stack gap={6}>
        <Title order={1}>{c.name}</Title>
        <Text c="dimmed" maw={640}>
          {t.lead}
        </Text>
      </Stack>
      <Card component="section" aria-labelledby="company-registry">
        <Title order={2} size="h3" id="company-registry" mb="md">
          {t.registry}
        </Title>
        <Facts
          rows={[
            [f.inn, c.inn],
            [f.ogrn, c.ogrn],
            [f.registeredAt, formatDate(c.registeredAt)],
            [f.head, c.head],
            [f.okved, `${c.okved} ${c.okvedName}`],
            [f.address, c.address],
          ]}
        />
        <Text size="sm" c="dimmed" mt="md">
          {tx.wizard.companySource}. {tx.wizard.companyOutdated}
        </Text>
      </Card>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card component="section" aria-labelledby="company-contact">
          <Title order={2} size="h3" id="company-contact" mb="md">
            {t.contact}
          </Title>
          <Text fw={600}>{account.person}</Text>
          <Text size="sm" c="dimmed">
            {account.role}
          </Text>
        </Card>
        <Card component="section" aria-labelledby="company-financials">
          <Title order={2} size="h3" id="company-financials" mb="md">
            {t.financials}
          </Title>
          <Facts
            rows={[
              [tx.wizard.summary.turnover, formatRub(k.avgMonthlyTurnover)],
              [tx.wizard.summary.revenue, formatRub(k.revenueLastYear)],
              [tx.wizard.summary.debts, formatRub(k.monthlyDebtPayments)],
              [tx.wizard.summary.employees, String(k.employees)],
            ]}
          />
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
