// Контракты кабинета клиента: продукты, заявка, решение банка, подписание.
// Кабинет пока работает на мок-адаптере (apps/client/src/shared/api/cabinet),
// api должен отдавать те же формы.
import { z } from "zod";

import { applicationStatusSchema, innSchema } from "@repo/contracts";

/** Зачем нужны деньги. С цели начинается подбор продукта. */
export const creditPurposeSchema = z.enum([
  "working_capital",
  "cash_gap",
  "equipment",
  "development",
]);
export type CreditPurpose = z.infer<typeof creditPurposeSchema>;

export const legalFormSchema = z.enum(["ip", "ooo"]);
export type LegalForm = z.infer<typeof legalFormSchema>;

/** Кредитный продукт. Ставка = ключевая ставка ЦБ + надбавка продукта. */
export const creditProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  purposes: z.array(creditPurposeSchema).min(1),
  description: z.string(),
  minAmount: z.number().int().positive(),
  maxAmount: z.number().int().positive(),
  minTermMonths: z.number().int().positive(),
  maxTermMonths: z.number().int().positive(),
  /** Надбавка к ключевой ставке, п. п. */
  spreadPp: z.number(),
  collateral: z.string().nullable(),
});
export type CreditProduct = z.infer<typeof creditProductSchema>;

export const productCatalogSchema = z.object({
  /** Ключевая ставка ЦБ, от которой считаются ставки, % годовых. */
  keyRate: z.number(),
  keyRateDate: z.string(),
  products: z.array(creditProductSchema),
});
export type ProductCatalog = z.infer<typeof productCatalogSchema>;

/** Карточка компании из ЕГРЮЛ/ЕГРИП в том виде, в каком её видит клиент. */
export const companyProfileSchema = z.object({
  inn: innSchema,
  ogrn: z.string(),
  form: legalFormSchema,
  name: z.string(),
  registeredAt: z.string(),
  okved: z.string(),
  okvedName: z.string(),
  address: z.string(),
  head: z.string(),
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;

/** Финансовые показатели: подставляются из счёта, клиент может поправить. */
export const financialsSchema = z.object({
  revenueLastYear: z.number().nonnegative(),
  avgMonthlyTurnover: z.number().nonnegative(),
  monthlyDebtPayments: z.number().nonnegative(),
  employees: z.number().int().nonnegative(),
});
export type Financials = z.infer<typeof financialsSchema>;

/** Демо-учётка действующего клиента банка (QA №3: без регистрации). */
export const demoAccountSchema = z.object({
  id: z.string(),
  person: z.string(),
  role: z.string(),
  company: companyProfileSchema,
  /** Что покажет сценарий на этой учётке, подсказка для проверяющих. */
  scenario: z.string(),
  /** Показатели, которые банк уже знает по расчётному счёту клиента. */
  knownFinancials: financialsSchema,
});
export type DemoAccount = z.infer<typeof demoAccountSchema>;

export const attachedDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["statement", "reporting", "tax_certificate", "other"]),
  sizeBytes: z.number().int().nonnegative(),
  addedAt: z.string(),
});
export type AttachedDocument = z.infer<typeof attachedDocumentSchema>;

export const consentsSchema = z.object({
  bki: z.literal(true),
  personalData: z.literal(true),
});
export type Consents = z.infer<typeof consentsSchema>;

/** Тело запроса на создание заявки. */
export const applicationInputSchema = z.object({
  purpose: creditPurposeSchema,
  productId: z.string(),
  amount: z.number().int().positive(),
  termMonths: z.number().int().positive(),
  comment: z.string().max(500),
  financials: financialsSchema,
  documents: z.array(attachedDocumentSchema),
  consents: consentsSchema,
});
export type ApplicationInput = z.infer<typeof applicationInputSchema>;

/** Фактор решения: на каких данных оно основано и куда сдвинуло (QA №37). */
export const decisionFactorSchema = z.object({
  label: z.string(),
  value: z.string(),
  source: z.string(),
  effect: z.enum(["positive", "negative", "neutral"]),
  note: z.string(),
});
export type DecisionFactor = z.infer<typeof decisionFactorSchema>;

export const offerTermsSchema = z.object({
  amount: z.number().int().positive(),
  termMonths: z.number().int().positive(),
  ratePercent: z.number(),
  monthlyPayment: z.number(),
});
export type OfferTerms = z.infer<typeof offerTermsSchema>;

export const decisionSchema = z.object({
  outcome: z.enum(["approved", "counter_offer", "rejected"]),
  decidedAt: z.string(),
  summary: z.string(),
  offer: offerTermsSchema.nullable(),
  factors: z.array(decisionFactorSchema),
  /** Что клиент может сделать после отказа. */
  advice: z.string().nullable(),
});
export type Decision = z.infer<typeof decisionSchema>;

/** Запрос банка к клиенту: уточнить данные или донести документ. */
export const clientRequestSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  question: z.string(),
  why: z.string(),
  documentKind: attachedDocumentSchema.shape.kind.nullable(),
  answer: z
    .object({
      text: z.string(),
      documents: z.array(attachedDocumentSchema),
      answeredAt: z.string(),
    })
    .nullable(),
});
export type ClientRequest = z.infer<typeof clientRequestSchema>;

export const applicationEventSchema = z.object({
  at: z.string(),
  text: z.string(),
  actor: z.enum(["client", "bank", "system"]),
});
export type ApplicationEvent = z.infer<typeof applicationEventSchema>;

/**
 * Этап внутри одобренной заявки. Статус из applicationStatusSchema остаётся
 * «approved», пока клиент принимает условия и подписывает договор.
 */
export const dealStageSchema = z.enum([
  "offer",
  "signing",
  "disbursing",
  "done",
]);
export type DealStage = z.infer<typeof dealStageSchema>;

export const applicationSchema = applicationInputSchema.extend({
  id: z.string(),
  number: z.string(),
  status: applicationStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  company: companyProfileSchema,
  /** Сколько этапов автоматической проверки уже пройдено (0..3). */
  checksPassed: z.number().int().min(0).max(3),
  requests: z.array(clientRequestSchema),
  decision: decisionSchema.nullable(),
  deal: z
    .object({
      stage: dealStageSchema,
      terms: offerTermsSchema,
      acceptedAt: z.string(),
      signedAt: z.string().nullable(),
      disbursedAt: z.string().nullable(),
      account: z.string(),
    })
    .nullable(),
  events: z.array(applicationEventSchema),
});
export type Application = z.infer<typeof applicationSchema>;

/** Подписание простой электронной подписью: код подтверждения (QA №12). */
export const signRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});
export type SignRequest = z.infer<typeof signRequestSchema>;

export const clientAnswerSchema = z.object({
  text: z.string().min(1).max(1000),
  documents: z.array(attachedDocumentSchema),
});
export type ClientAnswer = z.infer<typeof clientAnswerSchema>;
