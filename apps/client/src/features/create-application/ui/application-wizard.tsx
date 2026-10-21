"use client";

import {
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
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
import { formatDate, tx } from "@/shared/i18n";
import { InlineError, QueryError } from "@/shared/ui/query-state";

import classes from "./application-wizard.module.css";

const t = tx.wizard;
const STEPS = t.steps;
const LAST = STEPS.length - 1;
const financialKeys: (keyof Financials)[] = [
  "revenueLastYear",
  "avgMonthlyTurnover",
  "monthlyDebtPayments",
  "employees",
];
const financialLabels: Record<keyof Financials, string> = {
  revenueLastYear: t.revenue,
  avgMonthlyTurnover: t.turnover,
  monthlyDebtPayments: t.debtPayments,
  employees: t.employees,
};

type Errors = Partial<Record<string, string>>;
type FinancialsForm = Record<keyof Financials, number | string>;

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

/** Мастер заявки: пять шагов, черновик сохраняется при переходе между шагами. */
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

  const preview =
    product && !amountError(draft.amount, product.minAmount, product.maxAmount)
      ? estimate(
          product,
          catalog.data.keyRate,
          Number(draft.amount),
          Number(draft.termMonths) || product.minTermMonths,
        )
      : null;

  const steps: ReactNode[] = [
    <Stack gap="md" key="product">
      <Select
        label={tx.products.purposeLabel}
        data={purposes.map((p) => ({ value: p, label: tx.purposes[p].label }))}
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
      {product && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
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
      {preview && (
        <Text size="sm" aria-live="polite">
          {t.paymentPreview(
            formatRub(preview.payment),
            tx.common.percent(preview.rate),
          )}
        </Text>
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
      <Text>{t.companyLead}</Text>
      {company.isPending ? (
        <StateBlock kind="loading" title={t.companyLoading} />
      ) : company.isError ? (
        <QueryError error={company.error} onRetry={() => company.refetch()} />
      ) : (
        <div className={classes.sunken}>
          <SimpleGrid
            cols={{ base: 1, sm: 2 }}
            spacing="md"
            component="dl"
            m={0}
          >
            {(
              [
                ["name", company.data.name],
                ["inn", company.data.inn],
                ["ogrn", company.data.ogrn],
                ["registeredAt", formatDate(company.data.registeredAt)],
                ["okved", `${company.data.okved} ${company.data.okvedName}`],
                ["head", company.data.head],
                ["address", company.data.address],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <Text component="dt" size="sm" c="dimmed">
                  {t.companyFields[k]}
                </Text>
                <Text component="dd" m={0}>
                  {v}
                </Text>
              </div>
            ))}
          </SimpleGrid>
          <Text size="sm" c="dimmed" mt="md">
            {t.companySource}
          </Text>
        </div>
      )}
      <Text size="sm" c="dimmed">
        {t.companyOutdated}
      </Text>
    </Stack>,

    <Stack gap="md" key="finance">
      <Text>{t.financeLead}</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {financialKeys.map((k) => (
          <NumberInput
            key={k}
            label={financialLabels[k]}
            description={
              k === "monthlyDebtPayments" ? t.debtDescription : undefined
            }
            suffix={k === "employees" ? undefined : " ₽"}
            thousandSeparator=" "
            min={0}
            value={financials[k]}
            onChange={(v) => patch({ financials: { ...financials, [k]: v } })}
            error={errors[k]}
            hideControls
            inputMode="numeric"
          />
        ))}
      </SimpleGrid>
    </Stack>,

    <Stack gap="md" key="documents">
      <Text>{t.documentsLead}</Text>
      <Dropzone
        onDrop={(files) =>
          patch({
            documents: [
              ...draft.documents,
              ...files.map((f) => ({
                id: `${f.name}-${f.size}-${f.lastModified}`,
                name: f.name,
                kind: "other" as const,
                sizeBytes: f.size,
                addedAt: new Date().toISOString(),
              })),
            ],
          })
        }
        maxSize={10 * 1024 ** 2}
        accept={[
          "application/pdf",
          "image/png",
          "image/jpeg",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ]}
        radius="lg"
      >
        <Stack gap={4} align="center" py="lg">
          <Text fw={500} ta="center">
            {t.documentsDrop}
          </Text>
          <Text size="sm" c="dimmed">
            {t.documentsAccept}
          </Text>
        </Stack>
      </Dropzone>
      {draft.documents.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t.documentsEmpty}
        </Text>
      ) : (
        <Stack
          gap="xs"
          component="ul"
          p={0}
          m={0}
          style={{ listStyle: "none" }}
        >
          {draft.documents.map((d) => (
            <Group component="li" key={d.id} justify="space-between" gap="sm">
              <Text size="sm">
                {d.name}{" "}
                <Text span c="dimmed" size="sm">
                  {Math.max(1, Math.round(d.sizeBytes / 1024))} КБ
                </Text>
              </Text>
              <Button
                variant="subtle"
                size="xs"
                onClick={() =>
                  patch({
                    documents: draft.documents.filter((x) => x.id !== d.id),
                  })
                }
              >
                {t.remove}
              </Button>
            </Group>
          ))}
        </Stack>
      )}
      <Text size="sm" c="dimmed">
        {t.documentsNote}
      </Text>
    </Stack>,

    <Stack gap="lg" key="review">
      <Text>{t.reviewLead}</Text>
      <Summary
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
      <Summary
        title={STEPS[1]!}
        onEdit={() => go(1)}
        rows={[[t.summary.company, account.company.name]]}
      />
      <Summary
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
      <Summary
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

  return (
    <div className={classes.layout}>
      <nav aria-label={t.stepsLabel} className={classes.steps}>
        <Text size="sm" c="dimmed" className={classes.stepCount}>
          {t.stepOf(draft.step + 1, STEPS.length)}
        </Text>
        <ol className={classes.stepList}>
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                className={classes.stepButton}
                data-state={
                  i === draft.step ? "current" : i <= maxStep ? "done" : "next"
                }
                aria-current={i === draft.step ? "step" : undefined}
                disabled={i > maxStep}
                onClick={() => go(i)}
              >
                <span className={classes.stepIndex} aria-hidden>
                  {i + 1}
                </span>
                <span className={classes.stepLabel}>{s}</span>
              </button>
            </li>
          ))}
        </ol>
        <Text size="xs" c="dimmed" mt="md" visibleFrom="md">
          {t.savedDraft}
        </Text>
      </nav>

      <Paper
        withBorder
        radius="lg"
        p={{ base: "md", sm: "xl" }}
        className={classes.panel}
      >
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={draft.step}
            custom={dir}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <Stack gap="lg">
              <Title
                order={2}
                ref={headingRef}
                tabIndex={-1}
                className={classes.stepTitle}
              >
                {STEPS[draft.step]}
              </Title>
              {steps[draft.step]}
            </Stack>
          </motion.div>
        </AnimatePresence>
        <Group justify="space-between" mt="xl">
          {draft.step > 0 ? (
            <Button variant="default" onClick={() => go(draft.step - 1)}>
              {tx.common.back}
            </Button>
          ) : (
            <span />
          )}
          {draft.step === LAST ? (
            <Button onClick={submit} loading={create.isPending}>
              {t.submit}
            </Button>
          ) : (
            <Button onClick={() => go(draft.step + 1)}>{tx.common.next}</Button>
          )}
        </Group>
      </Paper>
    </div>
  );
}

function Summary({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: [string, string][];
  onEdit: () => void;
}) {
  return (
    <section>
      <Group justify="space-between" mb={6}>
        <Text fw={600}>{title}</Text>
        <Button variant="subtle" size="xs" onClick={onEdit}>
          {t.edit}
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={6} component="dl" m={0}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <Text component="dt" size="sm" c="dimmed">
              {label}
            </Text>
            <Text
              component="dd"
              m={0}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {value}
            </Text>
          </div>
        ))}
      </SimpleGrid>
    </section>
  );
}
