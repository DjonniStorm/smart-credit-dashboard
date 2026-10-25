import { Accordion, Alert, Card, Group, Stack, Text, Title } from "@mantine/core";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import {
  companySourceLabels,
  companySourceStateLabels,
  formatCompanyDate,
  isProblemSource,
  passportText,
  type CompanyPassportDensity,
} from "../model/model";

export function SourceList({
  sources,
  density,
}: {
  sources: CompanyProfileResponse["sources"];
  density: CompanyPassportDensity;
}) {
  return (
    <Card component="section">
      <Title order={density === "compact" ? 4 : 3}>{passportText.sourcesTitle}</Title>
      <Accordion
        multiple
        defaultValue={sources.filter(isProblemSource).map((source) => source.source)}
        mt="sm"
      >
        {sources.map((source) => (
          <Accordion.Item key={source.source} value={source.source}>
            <Accordion.Control>
              <Group justify="space-between" wrap="nowrap" pr="sm">
                <Text size="sm" fw={600}>{companySourceLabels[source.source]}</Text>
                <Text size="xs" c="dimmed">{companySourceStateLabels[source.state]}</Text>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="xs">
                <Text size="sm">{source.summary}</Text>
                <Text size="xs" c="dimmed">
                  {source.checkedAt
                    ? passportText.checkedAt(formatCompanyDate(source.checkedAt))
                    : passportText.notChecked}
                </Text>
                {source.reason && (
                  <Text size="sm" c="orange">{passportText.nextStep(source.reason)}</Text>
                )}
                {source.facts.map((fact) => (
                  <Text key={fact.key} size="sm">{fact.label}: {fact.value}</Text>
                ))}
                {source.discrepancies.map((item) => (
                  <Alert key={item.key} color="yellow" title={item.label}>
                    {companySourceLabels[item.firstSource]}: {item.firstValue}; {" "}
                    {companySourceLabels[item.secondSource]}: {item.secondValue}. {item.nextStep}
                  </Alert>
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Card>
  );
}
