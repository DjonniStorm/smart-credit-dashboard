import { Badge, Card, Group, SimpleGrid, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconClock } from "@tabler/icons-react";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import {
  companySourceStateLabels,
  formatCompanyDate,
  passportText,
  type CompanyPassportDensity,
  type CompanyPassportSource,
} from "../model/model";
import { PassportFact } from "./fact";

export function PassportHeader({
  profile,
  state,
  density,
}: {
  profile: CompanyProfileResponse;
  state: CompanyPassportSource["state"];
  density: CompanyPassportDensity;
}) {
  return (
    <Card component="section">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Title order={density === "compact" ? 4 : 2} id="company-passport-title">
            {profile.profile.name}
          </Title>
          <Text size="sm" c="dimmed">
            {passportText.inn} {profile.profile.inn}
          </Text>
        </div>
        <Badge leftSection={<SourceStateIcon state={state} size={14} />}>
          {state === "confirmed"
            ? passportText.profileConfirmed
            : companySourceStateLabels[state]}
        </Badge>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="md">
        <PassportFact label={passportText.ogrn} value={profile.profile.ogrn} />
        <PassportFact
          label={passportText.legalForm}
          value={profile.profile.legalForm === "ip" ? passportText.ip : passportText.ooo}
        />
        <PassportFact label={passportText.director} value={profile.profile.director} />
        <PassportFact label={passportText.okved} value={profile.profile.okved} />
        <PassportFact label={passportText.region} value={profile.profile.region} />
        <PassportFact
          label={passportText.registeredAt}
          value={formatCompanyDate(profile.profile.registeredAt)}
        />
        {density === "full" && (
          <PassportFact label={passportText.address} value={profile.profile.address} />
        )}
      </SimpleGrid>
    </Card>
  );
}

function SourceStateIcon({
  state,
  size,
}: {
  state: CompanyPassportSource["state"];
  size: number;
}) {
  if (state === "confirmed") {
    return <IconCheck size={size} />;
  }
  if (state === "pending") {
    return <IconClock size={size} />;
  }
  return <IconAlertTriangle size={size} />;
}
