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

export const companySourceSnapshotSchema = z.object({
  source: companySourceSchema,
  state: companySourceStateSchema,
  summary: z.string().min(1),
  facts: z.array(companyFactSchema),
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
