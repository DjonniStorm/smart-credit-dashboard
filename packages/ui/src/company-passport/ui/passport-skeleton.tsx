import { Card, Skeleton, Stack } from "@mantine/core";

import { passportText, type CompanyPassportDensity } from "../model/model";

export function PassportSkeleton({ density }: { density: CompanyPassportDensity }) {
  return (
    <Stack gap="md" aria-busy="true" aria-label={passportText.loading}>
      <Card>
        <Skeleton height={24} width="55%" />
        <Skeleton height={16} width="35%" mt="xs" />
        <Skeleton height={80} mt="md" />
      </Card>
      <Card>
        <Skeleton height={20} width="35%" />
        <Skeleton height={density === "compact" ? 100 : 180} mt="md" />
      </Card>
    </Stack>
  );
}
