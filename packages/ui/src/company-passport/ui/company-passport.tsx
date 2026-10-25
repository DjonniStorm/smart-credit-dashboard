"use client";

import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import { BkiConsent } from "./bki-consent";
import { AlfiHint } from "./alfi-hint";
import { FinancialContext } from "./financial-context";
import { PassportHeader } from "./passport-header";
import { PassportSkeleton } from "./passport-skeleton";
import { SourceList } from "./source-list";
import {
  getPassportState,
  passportText,
  type CompanyPassportDensity,
  type CompanyPassportMode,
} from "../model/model";

export type CompanyPassportProps = {
  profile?: CompanyProfileResponse;
  mode: CompanyPassportMode;
  density?: CompanyPassportDensity;
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
  consentPending?: boolean;
  consentError?: string | null;
  onGrantBkiConsent?: () => void;
  financials?: Array<{ label: string; value: string }>;
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
      <Alert color="red" title={passportText.errorTitle} role="alert">
        <Group justify="space-between" align="center" mt="xs">
          <Text size="sm">{error}</Text>
          {retry && (
            <Button size="xs" variant="default" onClick={retry}>
              {passportText.retry}
            </Button>
          )}
        </Group>
      </Alert>
    );
  }
  if (!profile) {
    return (
      <Alert title={passportText.unavailableTitle}>
        {passportText.unavailableText}
      </Alert>
    );
  }

  const passportState = getPassportState(profile.sources);
  return (
    <Stack gap="md" aria-labelledby="company-passport-title">
      <PassportHeader profile={profile} state={passportState} density={density} />
      <SourceList sources={profile.sources} density={density} />
      <BkiConsent
        profile={profile}
        mode={mode}
        pending={consentPending}
        error={consentError}
        onGrant={onGrantBkiConsent}
      />
      <FinancialContext financials={financials} density={density} />
      <AlfiHint profile={profile} state={passportState} />
    </Stack>
  );
}
