"use client";

import {
  ActionIcon,
  Anchor,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowRight, IconFileText } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  type ApplicationInput,
  type CreditPurpose,
  type DemoAccount,
  type Financials,
  creditPurposeSchema,
} from "@repo/contracts/cabinet";
import { AmountInput } from "@repo/ui/amount-input";
import { amountError, formatRub } from "@repo/ui/money";
import { stepVariants } from "@repo/ui/motion";
import { StateBlock } from "@repo/ui/state-block";

import {
  type ApplicationDraft,
  clearDraft,
  loadDraft,
  saveDraft,
  useCreateApplication,
} from "@/entities/application";
import {
  estimate,
  fitsPurpose,
  purposes,
  useCatalog,
} from "@/entities/product";
import { cabinetApi } from "@/shared/api/cabinet";
import { formatDate, lx, tx } from "@/shared/i18n";
import { InlineError, QueryError } from "@/shared/ui/query-state";

import classes from "./application-wizard.module.css";
import { CreditSummary } from "./credit-summary";
import { DocumentsStep } from "./documents-step";
import { FinanceStep, type FinancialsForm } from "./finance-step";
import { WizardStepper } from "./wizard-stepper";

const t = tx.wizard;
const w = lx.wizard;
const STEPS = lx.steps;
const LAST = STEPS.length - 1;
const financialKeys: (keyof Financials)[] = [
  "revenueLastYear",
  "avgMonthlyTurnover",
  "monthlyDebtPayments",
  "employees",
];
const stepHeads: { title: string; lead?: string }[] = [
  { title: w.purposeTitle, lead: w.purposeLead },
  { title: w.companyTitle, lead: t.companyLead },
  { title: w.financeTitle, lead: w.financeLead },
  { title: w.documentsTitle, lead: w.documentsLead },
  { title: w.reviewTitle, lead: t.reviewLead },
];

type Errors = Partial<Record<string, string>>;

function initialDraft(
  params: URLSearchParams,
  account: DemoAccount,
): ApplicationDraft {
  if (params.get("draft")) {
    const saved = loadDraft();
    if (saved && saved.accountId === account.id) return saved;
  }
  const purpose = creditPurposeSchema.safeParse(params.get("purpose"));
  return {
    accountId: account.id,
    step: 0,
    purpose: purpose.success ? purpose.data : "working_capital",
    productId: params.get("product") ?? "",
    amount: Number(params.get("amount")) || "",
    termMonths: Number(params.get("term")) || "",
    comment: "",
    // Банк знает обороты по счёту клиента: подставляем, клиент правит.
    financials: { ...account.knownFinancials },
    documents: [],
    savedAt: new Date().toISOString(),
  };
}

/** Мастер заявки по business.jpg: степпер, карточка шага, сводка справа, подвал. */
export function ApplicationWizard({ account }: { account: DemoAccount }) {
  const params = useSearchParams();
  const router = useRouter();
  const catalog = useCatalog();
  const company = useQuery({
    queryKey: ["egrul", account.company.inn],
    queryFn: () => cabinetApi.lookupCompany(account.company.inn),
  });
  const create = useCreateApplication();

  const [draft, setDraft] = useState(() => initialDraft(params, account));
  const [maxStep, setMaxStep] = useState(draft.step);
  const [dir, setDir] = useState<1 | -1>(1);
  const [errors, setErrors] = useState<Errors>({});
  const [consents, setConsents] = useState({ bki: false, pd: false });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const financials: FinancialsForm =
    draft.financials ?? account.knownFinancials;
  const products = catalog.data?.products ?? [];
  const available = products.filter((p) => fitsPurpose(p, draft.purpose));
  const product = products.find((p) => p.id === draft.productId);

  // Фокус на заголовок нового шага: клавиатура и скринридер начинают с него.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [draft.step]);

  function patch(p: Partial<ApplicationDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function validate(step: number): Errors {
    const e: Errors = {};
    if (step === 0) {
      if (!product) {
        e.product = t.productRequired;
      } else {
        const amountErr = amountError(
          draft.amount,
          product.minAmount,
          product.maxAmount,
        );
        if (amountErr) e.amount = amountErr;
        const term = Number(draft.termMonths);
        if (
          !term ||
          term < product.minTermMonths ||
          term > product.maxTermMonths
        ) {
          e.term = t.termRequired(product.minTermMonths, product.maxTermMonths);
        }
      }
    }
    if (step === 2) {
      for (const k of financialKeys) {
        const v = financials[k];
        if (v === "" || Number.isNaN(Number(v))) e[k] = t.fieldRequired;
      }
    }
    if (step === LAST) {
      if (!consents.bki) e.bki = t.consentRequired;
      if (!consents.pd) e.pd = t.consentRequired;
    }
    return e;
  }

  function go(step: number) {
    if (step > draft.step) {
      // Вперёд можно, только если пройденные шаги заполнены верно.
      for (let s = draft.step; s < step; s += 1) {
        const e = validate(s);
        if (Object.keys(e).length > 0) {
          setErrors(e);
          if (s !== draft.step) setDraft((d) => ({ ...d, step: s }));
          return;
        }
      }
    }
    setErrors({});
    setDir(step > draft.step ? 1 : -1);
    const next = { ...draft, step, savedAt: new Date().toISOString() };
    setDraft(next);
    setMaxStep((m) => Math.max(m, step));
    saveDraft(next);
  }

  function saveNow() {
    saveDraft({ ...draft, savedAt: new Date().toISOString() });
    notifications.show({ message: w.draftSaved });
  }

  function submit() {
    const e = validate(LAST);
    setErrors(e);
    if (Object.keys(e).length > 0 || !product) return;
    const input: ApplicationInput = {
      purpose: draft.purpose,
      productId: product.id,
      amount: Number(draft.amount),
      termMonths: Number(draft.termMonths),
      comment: draft.comment.trim(),
      financials: {
        revenueLastYear: Number(financials.revenueLastYear),
        avgMonthlyTurnover: Number(financials.avgMonthlyTurnover),
        monthlyDebtPayments: Number(financials.monthlyDebtPayments),
        employees: Number(financials.employees),
      },
      documents: draft.documents,
      consents: { bki: true, personalData: true },
    };
    create.mutate(input, {
      onSuccess: (app) => {
        clearDraft();
        router.push(`/applications/${app.id}`);
      },
    });
  }

  if (catalog.isPending) {
    return <StateBlock kind="loading" title={tx.products.loading} />;
  }
  if (catalog.isError) {
    return (
      <QueryError error={catalog.error} onRetry={() => catalog.refetch()} />
    );
  }

  const amountOk =
    product && !amountError(draft.amount, product.minAmount, product.maxAmount);
  const term = Number(draft.termMonths);
  // Платёж показываем только для срока, который клиент ввёл и банк допускает.
  const termOk =
    product && term >= product.minTermMonths && term <= product.maxTermMonths;
  const preview =
    product && amountOk && termOk
      ? estimate(product, catalog.data.keyRate, Number(draft.amount), term)
      : null;

  const steps: ReactNode[] = [
    <Stack gap="lg" key="purpose">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        <Select
          label={tx.products.purposeLabel}
          data={purposes.map((p) => ({
            value: p,
            label: tx.purposes[p].label,
          }))}
          value={draft.purpose}
          allowDeselect={false}
          onChange={(v) => {
            const purpose = v as CreditPurpose;
            const keep = products.find(
              (p) => p.id === draft.productId && fitsPurpose(p, purpose),
            );
            patch({ purpose, productId: keep ? keep.id : "" });
          }}
        />
        <Select
          label={t.product}
          placeholder={t.productPlaceholder}
          data={available.map((p) => ({ value: p.id, label: p.name }))}
          value={draft.productId || null}
          onChange={(v) => patch({ productId: v ?? "" })}
          error={errors.product}
        />
      </SimpleGrid>
      {product && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <AmountInput
            min={product.minAmount}
            max={product.maxAmount}
            value={draft.amount}
            onChange={(v) => patch({ amount: v })}
            showError={Boolean(errors.amount)}
          />
          <NumberInput
            label={tx.products.termLabel}
            description={t.termRequired(
              product.minTermMonths,
              product.maxTermMonths,
            )}
            suffix=" мес."
            value={draft.termMonths}
            onChange={(v) => patch({ termMonths: v })}
            error={errors.term}
            hideControls
            inputMode="numeric"
          />
        </SimpleGrid>
      )}
      <Textarea
        label={t.comment}
        description={t.commentDescription}
        placeholder={t.commentPlaceholder}
        value={draft.comment}
        onChange={(e) => patch({ comment: e.currentTarget.value })}
        maxLength={500}
        autosize
        minRows={2}
      />
    </Stack>,

    <Stack gap="md" key="company">
      {company.isPending ? (
        <StateBlock kind="loading" title={t.companyLoading} />
      ) : company.isError ? (
        <QueryError error={company.error} onRetry={() => company.refetch()} />
      ) : (
        <div className={classes.sunken}>
          <SimpleGrid
            cols={{ base: 1, sm: 2, lg: 3 }}
            spacing="lg"
            component="dl"
            m={0}
          >
            {(
              [
                ["name", company.data.name],
                ["inn", company.data.inn],
                ["ogrn", company.data.ogrn],
                ["registeredAt", formatDate(company.data.registeredAt)],
                ["head", company.data.head],
                ["okved", `${company.data.okved} ${company.data.okvedName}`],
                ["address", company.data.address],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <Text component="dt" size="sm" c="dimmed">
                  {t.companyFields[k]}
                </Text>
                <Text component="dd" m={0} className={classes.num}>
                  {v}
                </Text>
              </div>
            ))}
          </SimpleGrid>
        </div>
      )}
      <Text size="sm" c="dimmed">
        {t.companySource}. {t.companyOutdated}
      </Text>
    </Stack>,

    <FinanceStep
      key="finance"
      financials={financials}
      registeredAt={account.company.registeredAt}
      payment={preview?.payment ?? null}
      errors={errors}
      onChange={(next) => patch({ financials: next })}
    />,

    <DocumentsStep
      key="documents"
      documents={draft.documents}
      onChange={(documents) => patch({ documents })}
    />,

    <Stack gap="lg" key="review">
      <Review
        title={STEPS[0]!}
        onEdit={() => go(0)}
        rows={[
          [t.summary.purpose, tx.purposes[draft.purpose].label],
          [t.summary.product, product?.name ?? ""],
          [t.summary.amount, formatRub(Number(draft.amount))],
          [t.summary.term, tx.common.months(Number(draft.termMonths))],
          ...(draft.comment
            ? [[t.summary.comment, draft.comment] as [string, string]]
            : []),
        ]}
      />
      <Review
        title={STEPS[1]!}
        onEdit={() => go(1)}
        rows={[[t.summary.company, account.company.name]]}
      />
      <Review
        title={STEPS[2]!}
        onEdit={() => go(2)}
        rows={[
          [t.summary.revenue, formatRub(Number(financials.revenueLastYear))],
          [
            t.summary.turnover,
            formatRub(Number(financials.avgMonthlyTurnover)),
          ],
          [t.summary.debts, formatRub(Number(financials.monthlyDebtPayments))],
          [t.summary.employees, String(financials.employees)],
        ]}
      />
      <Review
        title={STEPS[3]!}
        onEdit={() => go(3)}
        rows={[
          [
            t.summary.documents,
            draft.documents.length
              ? draft.documents.map((d) => d.name).join(", ")
              : t.summary.none,
          ],
        ]}
      />
      <Stack gap="sm">
        <Checkbox
          color="primary"
          label={t.consentBki}
          checked={consents.bki}
          onChange={(e) => {
            const bki = e.currentTarget.checked;
            setConsents((c) => ({ ...c, bki }));
          }}
          error={errors.bki}
        />
        <Checkbox
          color="primary"
          label={t.consentPd}
          checked={consents.pd}
          onChange={(e) => {
            const pd = e.currentTarget.checked;
            setConsents((c) => ({ ...c, pd }));
          }}
          error={errors.pd}
        />
      </Stack>
      {create.isError && (
        <InlineError>
          {t.submitError}: {create.error.message}
        </InlineError>
      )}
    </Stack>,
  ];

  const head = stepHeads[draft.step]!;

  return (
    <div className={classes.page}>
      <div className={classes.top}>
        <Breadcrumbs separator="/" className={classes.crumbs}>
          <Anchor component={Link} href="/products" size="sm" c="dimmed">
            {w.crumbs}
          </Anchor>
          <Text size="sm" c="dimmed" aria-current="page">
            {t.title}
          </Text>
        </Breadcrumbs>
        <Title order={1}>{product ? w.titleFor(product.name) : t.title}</Title>
        <WizardStepper step={draft.step} maxStep={maxStep} onGo={go} />
      </div>

      <div className={classes.side}>
        <CreditSummary
          purpose={draft.purpose}
          product={product}
          amount={amountOk ? Number(draft.amount) : null}
          termMonths={termOk ? term : null}
          preview={preview}
          onEdit={() => go(0)}
        />
      </div>

      <Card className={classes.panel} padding={0}>
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={draft.step}
            custom={dir}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className={classes.panelBody}
          >
            <Stack gap={4} mb="lg">
              <Title
                order={2}
                ref={headingRef}
                tabIndex={-1}
                className={classes.stepTitle}
              >
                {head.title}
              </Title>
              {head.lead && (
                <Text size="sm" c="dimmed" maw={720}>
                  {head.lead}
                </Text>
              )}
            </Stack>
            {steps[draft.step]}
          </motion.div>
        </AnimatePresence>
      </Card>

      <div className={classes.footer}>
        {draft.step > 0 ? (
          <Button variant="default" onClick={() => go(draft.step - 1)}>
            {tx.common.back}
          </Button>
        ) : (
          <Button variant="default" component={Link} href="/products">
            {tx.common.back}
          </Button>
        )}
        <Group gap="sm" wrap="nowrap" className={classes.footerEnd}>
          <Button
            variant="subtle"
            leftSection={<IconFileText size={16} stroke={1.5} aria-hidden />}
            onClick={saveNow}
            className={classes.saveDraft}
            visibleFrom="sm"
          >
            {w.saveDraft}
          </Button>
          <ActionIcon
            variant="subtle"
            size={44}
            onClick={saveNow}
            className={classes.saveDraft}
            aria-label={w.saveDraft}
            hiddenFrom="sm"
          >
            <IconFileText size={20} stroke={1.5} aria-hidden />
          </ActionIcon>
          {draft.step === LAST ? (
            <Button onClick={submit} loading={create.isPending}>
              {t.submit}
            </Button>
          ) : (
            <Button
              onClick={() => go(draft.step + 1)}
              rightSection={
                <IconArrowRight size={18} stroke={1.75} aria-hidden />
              }
            >
              {w.continue}
            </Button>
          )}
        </Group>
      </div>
    </div>
  );
}

function Review({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: [string, string][];
  onEdit: () => void;
}) {
  return (
    <section className={classes.review}>
      <Group justify="space-between" mb={6}>
        <Text fw={600}>{title}</Text>
        <Anchor
          component="button"
          type="button"
          size="sm"
          onClick={onEdit}
          className={classes.editLink}
        >
          {t.edit}
        </Anchor>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={6} component="dl" m={0}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <Text component="dt" size="sm" c="dimmed">
              {label}
            </Text>
            <Text component="dd" m={0} className={classes.num}>
              {value}
            </Text>
          </div>
        ))}
      </SimpleGrid>
    </section>
  );
}
