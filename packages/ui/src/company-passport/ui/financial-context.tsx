import { Card, SimpleGrid, Title } from "@mantine/core";

import { passportText, type CompanyPassportDensity } from "../model/model";
import { PassportFact } from "./fact";

export function FinancialContext({
  financials,
  density,
}: {
  financials: Array<{ label: string; value: string }>;
  density: CompanyPassportDensity;
}) {
  if (financials.length === 0) {
    return null;
  }
  return (
    <Card component="section">
      <Title order={density === "compact" ? 4 : 3}>{passportText.financialTitle}</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="sm">
        {financials.map((fact) => (
          <PassportFact key={fact.label} label={fact.label} value={fact.value} />
        ))}
      </SimpleGrid>
    </Card>
  );
}
