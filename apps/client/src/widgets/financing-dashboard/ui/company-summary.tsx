import { Button, Card, Stack, Text, Title } from "@mantine/core";
import Link from "next/link";

import type { DemoAccount } from "@repo/contracts/cabinet";
import { formatRub } from "@repo/ui/money";

import { useCompanyProfile } from "@/entities/company";
import { fx } from "@/shared/i18n";

export function CompanySummary({ account }: { account: DemoAccount }) {
  const profile = useCompanyProfile(account.company.inn);
  const values = account.knownFinancials;
  const facts = [
    [fx.turnover, values?.avgMonthlyTurnover],
    [fx.revenue, values?.revenueLastYear],
    [fx.debt, values?.monthlyDebtPayments],
  ] as const;
  const sources = profile.data?.sources ?? [];
  const issue = sources.some((source) => {
    return ["discrepancy", "unavailable", "manual_check"].includes(
      source.state,
    );
  });
  const pending = sources.some((source) => {
    return source.state === "pending";
  });
  const note =
    profile.data?.bkiConsent.status === "required"
      ? fx.consent
      : issue
        ? fx.companyIssue
        : pending
          ? fx.companyPending
          : null;
  return (
    <Card
      component="section"
      aria-labelledby="financing-company-title"
      h="100%"
    >
      <Stack gap="lg">
        <div>
          <Title order={2} id="financing-company-title" size="h3">
            {fx.company}
          </Title>
          <Text c="dimmed" size="xs" mt={6}>
            {fx.source}
          </Text>
        </div>
        {facts.map(([label, value]) => {
          return (
            <div key={label}>
              <Text c="dimmed" size="sm">
                {label}
              </Text>
              <Text fw={700} size="xl">
                {value === undefined || value === null
                  ? fx.noData
                  : formatRub(value)}
              </Text>
            </div>
          );
        })}
        {profile.isPending && (
          <Text size="sm" c="dimmed">
            {fx.sourceLoading}
          </Text>
        )}
        {profile.isError && (
          <div>
            <Text size="sm">{fx.sourceError}</Text>
            <Button
              variant="subtle"
              onClick={() => {
                void profile.refetch();
              }}
            >
              {fx.retry}
            </Button>
          </div>
        )}
        {note && (
          <Text size="sm" c="var(--kk-warning)">
            {note}
          </Text>
        )}
        <Button component={Link} href="/company" variant="default">
          {fx.companyLink}
        </Button>
      </Stack>
    </Card>
  );
}
