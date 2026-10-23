import { Alert, Button, Text } from "@mantine/core";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import { formatCompanyDate, passportText, type CompanyPassportMode } from "../model/model";

export function BkiConsent({
  profile,
  mode,
  pending,
  error,
  onGrant,
}: {
  profile: CompanyProfileResponse;
  mode: CompanyPassportMode;
  pending: boolean;
  error: string | null;
  onGrant?: () => void;
}) {
  if (profile.bkiConsent.status === "granted") {
    return (
      <Text size="sm" c="dimmed" aria-live="polite">
        {passportText.bkiGranted(formatCompanyDate(profile.bkiConsent.grantedAt))}
      </Text>
    );
  }

  return (
    <Alert color="yellow" title={passportText.bkiRequiredTitle}>
      {passportText.bkiRequiredText}
      {mode === "client" && onGrant && (
        <Button mt="sm" onClick={onGrant} loading={pending}>
          {passportText.grantBkiConsent}
        </Button>
      )}
      {error && <Text c="red" size="sm" mt="xs" role="alert">{error}</Text>}
      {mode === "backoffice" && (
        <Text size="sm" mt="xs">{passportText.bkiBackofficeText}</Text>
      )}
    </Alert>
  );
}
