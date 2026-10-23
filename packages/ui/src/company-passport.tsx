"use client";

import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
} from "@tabler/icons-react";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import { Alfi } from "./alfi-character";
import { AlfiState } from "./alfi-state";

type PassportMode = "client" | "backoffice";
type PassportDensity = "compact" | "full";
type Source = CompanyProfileResponse["sources"][number];

export type CompanyPassportProps = {
  profile?: CompanyProfileResponse;
  mode: PassportMode;
  density?: PassportDensity;
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
  consentPending?: boolean;
  consentError?: string | null;
  onGrantBkiConsent?: () => void;
  financials?: Array<{ label: string; value: string }>;
};

export const companySourceLabels: Record<Source["source"], string> = {
  egrul: "ЕГРЮЛ/ЕГРИП",
  fns: "ФНС",
  bki: "БКИ",
  bank_turnover: "Обороты по счёту",
};

export const companySourceStateLabels: Record<Source["state"], string> = {
  confirmed: "Подтверждено",
  pending: "Ожидает действия",
  discrepancy: "Есть расхождение",
  unavailable: "Источник недоступен",
  manual_check: "Нужна ручная проверка",
};

export function CompanyPassport({
  profile,
  mode,
  density = "full",
  loading = false,
  error = null,
  retry,
  consentPending = false,
  consentError = null,
  onGrantBkiConsent,
  financials = [],
}: CompanyPassportProps) {
  if (loading) {
    return <PassportSkeleton density={density} />;
  }
  if (error) {
    return (
      <Alert color="red" title="Паспорт компании не загрузился" role="alert">
        <Group justify="space-between" align="center" mt="xs">
          <Text size="sm">{error}</Text>
          {retry && <Button size="xs" variant="default" onClick={retry}>Повторить</Button>}
        </Group>
      </Alert>
    );
  }
  if (!profile) {
    return <Alert title="Паспорт пока недоступен">Данные компании ещё не получены.</Alert>;
  }

  const passportState = getPassportState(profile.sources);
  const alfi = getAlfiState(profile, passportState);

  return (
    <Stack gap="md" aria-labelledby="company-passport-title">
      <Card component="section">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div>
            <Title order={density === "compact" ? 4 : 2} id="company-passport-title">
              {profile.profile.name}
            </Title>
            <Text size="sm" c="dimmed">ИНН {profile.profile.inn}</Text>
          </div>
          <Badge leftSection={<IconForState state={passportState} size={14} />}>
            {passportState === "confirmed" ? "Профиль подтверждён" : companySourceStateLabels[passportState]}
          </Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="md">
          <Fact label="ОГРН/ОГРНИП" value={profile.profile.ogrn} />
          <Fact label="Форма" value={profile.profile.legalForm === "ip" ? "ИП" : "ООО"} />
          <Fact label="Руководитель" value={profile.profile.director} />
          <Fact label="ОКВЭД" value={profile.profile.okved} />
          <Fact label="Регион" value={profile.profile.region} />
          <Fact label="Дата регистрации" value={formatDate(profile.profile.registeredAt)} />
          {density === "full" && <Fact label="Адрес" value={profile.profile.address} />}
        </SimpleGrid>
      </Card>

      <Card component="section">
        <Title order={density === "compact" ? 4 : 3}>Источники данных</Title>
        <Accordion multiple defaultValue={profile.sources.filter(isProblemSource).map((source) => { return source.source; })} mt="sm">
          {profile.sources.map((source) => {
            return (
            <Accordion.Item key={source.source} value={source.source}>
              <Accordion.Control icon={<IconForState state={source.state} size={16} />}>
                <Group justify="space-between" wrap="nowrap" pr="sm">
                  <Text size="sm" fw={600}>{companySourceLabels[source.source]}</Text>
                  <Text size="xs" c="dimmed">{companySourceStateLabels[source.state]}</Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  <Text size="sm">{source.summary}</Text>
                  <Text size="xs" c="dimmed">
                    Проверено: {source.checkedAt ? formatDate(source.checkedAt) : "ещё не проверено"}
                  </Text>
                  {source.reason && <Text size="sm" c="orange">Следующий шаг: {source.reason}</Text>}
                  {source.facts.length > 0 && source.facts.map((fact) => {
                    return (
                    <Text key={fact.key} size="sm">{fact.label}: {fact.value}</Text>
                    );
                  })}
                  {source.discrepancies.map((item) => {
                    return (
                    <Alert key={item.key} color="yellow" title={item.label}>
                      {companySourceLabels[item.firstSource]}: {item.firstValue}; {companySourceLabels[item.secondSource]}: {item.secondValue}. {item.nextStep}
                    </Alert>
                    );
                  })}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
            );
          })}
        </Accordion>
      </Card>

      {profile.bkiConsent.status === "required" && (
        <Alert color="yellow" title="БКИ ещё не открыто">
          Факты БКИ появятся после согласия клиента. Отсутствие согласия не является отказом.
          {mode === "client" && onGrantBkiConsent && (
            <Button mt="sm" onClick={onGrantBkiConsent} loading={consentPending}>
              Разрешить запрос данных БКИ
            </Button>
          )}
          {consentError && <Text c="red" size="sm" mt="xs" role="alert">{consentError}</Text>}
          {mode === "backoffice" && <Text size="sm" mt="xs">Согласие выдаётся в кабинете клиента.</Text>}
        </Alert>
      )}
      {profile.bkiConsent.status === "granted" && (
        <Text size="sm" c="dimmed" aria-live="polite">
          Согласие на БКИ получено: {formatDate(profile.bkiConsent.grantedAt)}
        </Text>
      )}

      {financials.length > 0 && (
        <Card component="section">
          <Title order={density === "compact" ? 4 : 3}>Финансовый контекст</Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="sm">
            {financials.map((fact) => {
              return <Fact key={fact.label} label={fact.label} value={fact.value} />;
            })}
          </SimpleGrid>
        </Card>
      )}

      <Card component="aside" withBorder>
        <Group align="flex-start" wrap="nowrap">
          <Alfi state={alfi.state} size={56} />
          <div>
            <Text fw={600}>{alfi.title}</Text>
            <Text size="sm" c="dimmed">{alfi.message}</Text>
          </div>
        </Group>
      </Card>
    </Stack>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <Text size="sm"><Text span c="dimmed">{label}: </Text>{value}</Text>;
}

function isProblemSource(source: Source): boolean {
  return source.state === "discrepancy" || source.state === "manual_check" || source.state === "unavailable" || source.state === "pending";
}

function getPassportState(sources: Source[]): Source["state"] {
  if (sources.some((source) => source.state === "discrepancy")) {
    return "discrepancy";
  }
  if (sources.some((source) => source.state === "manual_check" || source.state === "unavailable")) {
    return "manual_check";
  }
  if (sources.some((source) => source.state === "pending")) {
    return "pending";
  }
  return "confirmed";
}

function getAlfiState(profile: CompanyProfileResponse, state: Source["state"]): { state: AlfiState; title: string; message: string } {
  if (state === "discrepancy") {
    return { state: AlfiState.Attention, title: "Найдены расхождения", message: "Откройте источник и проверьте значения перед продолжением." };
  }
  if (state === "manual_check" || state === "unavailable") {
    return { state: AlfiState.Attention, title: "Нужна ручная проверка", message: "Источник не ответил автоматически. Это не отказ по заявке." };
  }
  if (profile.bkiConsent.status === "required") {
    return { state: AlfiState.NeedsAnswer, title: "Нужно согласие на БКИ", message: "После согласия банк сможет показать кредитные обязательства компании." };
  }
  return { state: AlfiState.Success, title: "Паспорт готов", message: "Основные сведения компании подтверждены источниками." };
}

function IconForState({ state, size }: { state: Source["state"]; size: number }) {
  if (state === "confirmed") {
    return <IconCheck size={size} />;
  }
  if (state === "pending") {
    return <IconClock size={size} />;
  }
  return <IconAlertTriangle size={size} />;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("ru-RU");
}

function PassportSkeleton({ density }: { density: PassportDensity }) {
  return (
    <Stack gap="md" aria-busy="true" aria-label="Загружаем паспорт компании">
      <Card><Skeleton height={24} width="55%" /><Skeleton height={16} width="35%" mt="xs" /><Skeleton height={80} mt="md" /></Card>
      <Card><Skeleton height={20} width="35%" /><Skeleton height={density === "compact" ? 100 : 180} mt="md" /></Card>
    </Stack>
  );
}
