import { z } from "zod";

import { innSchema } from "@repo/contracts";

export const companyLegalFormSchema = z.enum(["ip", "ooo"]);
export type CompanyLegalForm = z.infer<typeof companyLegalFormSchema>;

export const companySourceSchema = z.enum([
  "egrul",
  "fns",
  "bki",
  "bank_turnover",
]);
export type CompanySource = z.infer<typeof companySourceSchema>;

export const companySourceStateSchema = z.enum([
  "pending",
  "confirmed",
  "discrepancy",
  "unavailable",
  "manual_check",
]);
export type CompanySourceState = z.infer<typeof companySourceStateSchema>;

export const companySourceActionSchema = z.enum([
  "none",
  "grant_bki_consent",
  "retry_source",
  "manual_review",
]);
export type CompanySourceAction = z.infer<typeof companySourceActionSchema>;

export const companyProfileSchema = z.object({
  inn: innSchema,
  ogrn: z.string().min(1),
  name: z.string().min(1),
  legalForm: companyLegalFormSchema,
  registeredAt: z.string().min(1),
  okved: z.string().min(1),
  region: z.string().min(1),
  address: z.string().min(1),
  director: z.string().min(1),
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;

export const companyFactSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string(),
  source: companySourceSchema,
  state: companySourceStateSchema,
  checkedAt: z.string().nullable(),
});
export type CompanyFact = z.infer<typeof companyFactSchema>;

export const companyDiscrepancySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  firstValue: z.string(),
  secondValue: z.string(),
  firstSource: companySourceSchema,
  secondSource: companySourceSchema,
  nextStep: z.string().min(1),
});
export type CompanyDiscrepancy = z.infer<typeof companyDiscrepancySchema>;

export const companySourceSnapshotSchema = z.object({
  source: companySourceSchema,
  state: companySourceStateSchema,
  summary: z.string().min(1),
  facts: z.array(companyFactSchema),
  discrepancies: z.array(companyDiscrepancySchema).default([]),
  action: companySourceActionSchema.default("none"),
  reason: z.string().nullable().default(null),
  checkedAt: z.string().nullable(),
});
export type CompanySourceSnapshot = z.infer<typeof companySourceSnapshotSchema>;

export const bkiConsentStatusSchema = z.enum(["required", "granted"]);
export type BkiConsentStatus = z.infer<typeof bkiConsentStatusSchema>;

export const bkiConsentSchema = z.object({
  status: bkiConsentStatusSchema,
  grantedAt: z.string().nullable(),
});
export type BkiConsent = z.infer<typeof bkiConsentSchema>;

export const bkiConsentRequestSchema = z.object({
  granted: z.literal(true),
});
export type BkiConsentRequest = z.infer<typeof bkiConsentRequestSchema>;

export const companyProfileResponseSchema = z.object({
  profile: companyProfileSchema,
  sources: z.array(companySourceSnapshotSchema),
  bkiConsent: bkiConsentSchema,
});
export type CompanyProfileResponse = z.infer<
  typeof companyProfileResponseSchema
>;
