"use client";

import {
  Alert,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import { formatDate } from "@/entities/application";

import classes from "./application-panel.module.css";

const sourceLabels: Record<
  CompanyProfileResponse["sources"][number]["source"],
  string
> = {
  egrul: "ЕГРЮЛ/ЕГРИП",
  fns: "ФНС",
  bki: "БКИ",
  bank_turnover: "Обороты по счёту",
};

const stateLabels: Record<
  CompanyProfileResponse["sources"][number]["state"],
  string
> = {
  pending: "Ожидает действия",
  confirmed: "Подтверждено",
  discrepancy: "Есть расхождение",
  unavailable: "Источник недоступен",
  manual_check: "Нужна ручная проверка",
};

export function CompanyProfileContext({
  profile,
}: {
  profile: CompanyProfileResponse;
}) {
  const { profile: company, sources, bkiConsent } = profile;

  return (
    <Card component="section" aria-labelledby="company-profile-context">
      <Title order={3} size="h4" id="company-profile-context" mb="md">
        Паспорт компании
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        <Text size="sm">Название: {company.name}</Text>
        <Text size="sm">ИНН: {company.inn}</Text>
        <Text size="sm">ОГРН: {company.ogrn}</Text>
        <Text size="sm">Руководитель: {company.director}</Text>
        <Text size="sm">ОКВЭД: {company.okved}</Text>
        <Text size="sm">Регион: {company.region}</Text>
        <Text size="sm">
          Дата регистрации: {formatDate(company.registeredAt)}
        </Text>
        <Text size="sm">Адрес: {company.address}</Text>
      </SimpleGrid>
      <Stack gap="xs" mt="md">
        {sources.map((source) => (
          <Group
            key={source.source}
            justify="space-between"
            gap="sm"
            wrap="nowrap"
          >
            <div>
              <Text size="sm" fw={600}>
                {sourceLabels[source.source]}
              </Text>
              <Text size="xs" c="dimmed">
                {source.summary}
              </Text>
            </div>
            <Text size="xs" className={classes.checkState}>
              {stateLabels[source.state]}
            </Text>
          </Group>
        ))}
      </Stack>
      {bkiConsent.status === "required" && (
        <Alert mt="md" color="yellow" title="БКИ ещё не открыто">
          Данные БКИ появятся после согласия клиента.
        </Alert>
      )}
    </Card>
  );
}
