"use client";

import { Alert, Button, Card, Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import type { DemoAccount } from "@repo/contracts/cabinet";
import type { CompanySourceSnapshot } from "@repo/contracts/company-profile";

import { formatRub } from "@repo/ui/money";

import { useCompanyProfile, useGrantBkiConsent } from "@/entities/company";
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
  return <CompanyProfileContent inn={account.company.inn} account={account} />;
}

function sourceLabel(source: CompanySourceSnapshot["source"]): string {
  return {
    egrul: "ЕГРЮЛ/ЕГРИП",
    fns: "ФНС",
    bki: "БКИ",
    bank_turnover: "Обороты по счёту",
  }[source];
}

function sourceStateLabel(state: CompanySourceSnapshot["state"]): string {
  return {
    pending: "Ожидает действия",
    confirmed: "Подтверждено",
    discrepancy: "Есть расхождение",
    unavailable: "Источник недоступен",
    manual_check: "Нужна ручная проверка",
  }[state];
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

  if (query.isPending) {
    return <Loader aria-label="Загружаем профиль компании" />;
  }
  if (query.isError) {
    return <Alert color="red">Профиль компании не загрузился.</Alert>;
  }

  const { profile, sources, bkiConsent } = query.data;
  const c = profile;
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
            [f.head, c.director],
            [f.okved, c.okved],
            [f.address, c.address],
          ]}
        />
        <Text size="sm" c="dimmed" mt="md">
          {tx.wizard.companySource}. {tx.wizard.companyOutdated}
        </Text>
      </Card>
      <Card component="section" aria-labelledby="company-sources">
        <Title order={2} size="h3" id="company-sources" mb="md">
          Источники данных
        </Title>
        <Stack gap="sm">
          {sources.map((source) => (
            <div key={source.source}>
              <Text fw={600}>{sourceLabel(source.source)}</Text>
              <Text size="sm">{sourceStateLabel(source.state)}</Text>
              <Text size="sm" c="dimmed">{source.summary}</Text>
              {source.facts.map((fact) => (
                <Text key={fact.key} size="sm">
                  {fact.label}: {fact.value}
                </Text>
              ))}
            </div>
          ))}
        </Stack>
        {bkiConsent.status === "required" ? (
          <Button
            mt="md"
            onClick={() => consent.mutate()}
            loading={consent.isPending}
          >
            Разрешить запрос данных БКИ
          </Button>
        ) : (
          <Text size="sm" c="dimmed" mt="md">
            Согласие на БКИ получено.
          </Text>
        )}
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
