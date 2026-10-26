import type {
  CreditProduct,
  CreditPurpose,
  Financials,
} from "@repo/contracts/cabinet";
import { StateBlock } from "@repo/ui/state-block";

import type { SandboxTerms } from "@/features/negotiation-sim";
import { tx } from "@/shared/i18n";
import { TermsSandbox } from "@/widgets/application-detail";

const t = tx.termsSandbox;

export interface TermsBlockProps {
  purpose: CreditPurpose;
  productId: string;
  amount: number | string;
  termMonths: number | string;
  financials: Record<keyof Financials, number | string>;
  products: CreditProduct[];
  keyRate: number;
  onChange: (next: SandboxTerms) => void;
}

/** Условия и варианты от банка на шаге «Финансы»: правки уходят в черновик. */
export function TermsBlock({
  purpose,
  productId,
  amount,
  termMonths,
  financials,
  products,
  keyRate,
  onChange,
}: TermsBlockProps) {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    return (
      <StateBlock kind="empty" title={t.emptyTitle}>
        {t.emptyText}
      </StateBlock>
    );
  }
  return (
    <TermsSandbox
      terms={{
        purpose,
        productId: product.id,
        amount: Number(amount),
        termMonths: Number(termMonths),
        financials: {
          revenueLastYear: Number(financials.revenueLastYear),
          avgMonthlyTurnover: Number(financials.avgMonthlyTurnover),
          monthlyDebtPayments: Number(financials.monthlyDebtPayments),
          employees: Number(financials.employees),
        },
      }}
      catalog={{ products, keyRate }}
      onTermsChange={onChange}
    />
  );
}
