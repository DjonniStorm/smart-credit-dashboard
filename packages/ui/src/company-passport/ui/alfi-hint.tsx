import { Card, Group, Text } from "@mantine/core";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import { Alfi } from "../../alfi-character";
import { getAlfiHint, type CompanyPassportSource } from "../model/model";

export function AlfiHint({
  profile,
  state,
}: {
  profile: CompanyProfileResponse;
  state: CompanyPassportSource["state"];
}) {
  const hint = getAlfiHint(profile, state);
  return (
    <Card component="aside" withBorder>
      <Group align="flex-start" wrap="nowrap">
        <Alfi state={hint.state} size={56} />
        <div>
          <Text fw={600}>{hint.title}</Text>
          <Text size="sm" c="dimmed">{hint.message}</Text>
        </div>
      </Group>
    </Card>
  );
}
