"use client";

import { Card, Group, Stack, Text, Title } from "@mantine/core";
import { CompanyPassport } from "@repo/ui/company-passport";
import { formatRub } from "@repo/ui/money";
import type { DemoAccount } from "@repo/contracts/cabinet";

import { useCompanyProfile, useGrantBkiConsent } from "@/entities/company";
import { useSession } from "@/entities/session";

export function CompanyProfile() {
  const account = useSession().data;
  if (!account) {
    return null;
  }
  return <CompanyProfileContent inn={account.company.inn} account={account} />;
}

function CompanyProfileContent({
  inn,
  account,
}: {
  inn: string;
  account: DemoAccount;
}) {
  const query = useCompanyProfile(inn);
  const consent = useGrantBkiConsent(inn);
  const financials = [
    { label: "Средний месячный оборот", value: formatRub(account.knownFinancials.avgMonthlyTurnover) },
    { label: "Выручка за 12 месяцев", value: formatRub(account.knownFinancials.revenueLastYear) },
    { label: "Платежи по долгам", value: formatRub(account.knownFinancials.monthlyDebtPayments) },
    { label: "Сотрудники", value: String(account.knownFinancials.employees) },
  ];

  return (
    <Stack gap="md">
      <CompanyPassport
        profile={query.data}
        mode="client"
        density="full"
        loading={query.isPending}
        error={query.isError ? query.error.message : null}
        retry={() => void query.refetch()}
        consentPending={consent.isPending}
        consentError={consent.isError ? consent.error.message : null}
        onGrantBkiConsent={() => consent.mutate()}
        financials={financials}
      />
      <Card component="section">
        <Title order={3}>Контактное лицо</Title>
        <Group gap="xs" mt="sm">
          <Text size="sm" fw={600}>{account.person}</Text>
          <Text size="sm" c="dimmed">{account.role}</Text>
        </Group>
      </Card>
    </Stack>
  );
}
