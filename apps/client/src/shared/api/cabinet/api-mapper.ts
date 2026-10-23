import type {
  ApiApplication,
  ApiProductCatalog,
  DemoSession,
} from "@repo/contracts/api";
import type {
  Application,
  CompanyProfile,
  ProductCatalog,
} from "@repo/contracts/cabinet";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";

import { tx } from "@/shared/i18n";

function statusOf(application: ApiApplication): Application["status"] {
  switch (application.status) {
    case "DRAFT":
      return "draft";
    case "NEEDS_INFO":
      return "needs_client";
    case "OFFERED":
      return application.offerKind === "counter" ? "counter_offer" : "approved";
    case "ACCEPTED":
    case "SIGNING":
      return "approved";
    case "FUNDED":
      return "disbursed";
    case "REJECTED":
    case "CANCELLED":
      return "rejected";
    case "BLOCKED":
      return "blocked";
    default:
      return "in_review";
  }
}

function annuityPayment(
  amount: number,
  termMonths: number,
  ratePct: number,
): number {
  const monthly = ratePct / 100 / 12;
  if (monthly === 0) {
    return Math.round(amount / termMonths);
  }
  return Math.round((amount * monthly) / (1 - (1 + monthly) ** -termMonths));
}

function decisionOf(application: ApiApplication): Application["decision"] {
  const scoring = application.scoring;
  if (!scoring) {
    return null;
  }
  const factors = scoring.factors.map((factor) => {
    return {
      label: factor.label,
      value: factor.value,
      source: factor.source ?? "scoring",
      effect:
        factor.impact >= 0 ? ("positive" as const) : ("negative" as const),
      note: "Фактор baseline scoring",
    };
  });
  const advice = scoring.nextActions[0] ?? null;

  // Решение сотрудника важнее рекомендации скоринга. После принятия и отказа клиента
  // решение банка остаётся прежним: по нему кабинет отличает отказ клиента от отказа банка.
  const declinedByClient =
    application.status === "CANCELLED" && application.cancelledBy === "client";
  if (
    application.offer &&
    (["OFFERED", "ACCEPTED", "SIGNING", "FUNDED"].includes(
      application.status,
    ) ||
      declinedByClient)
  ) {
    const { amount, termMonths, ratePct } = application.offer;
    const counter = application.offerKind === "counter";
    return {
      outcome: counter ? "counter_offer" : "approved",
      decidedAt: application.updatedAt,
      summary:
        application.clientComments.at(-1)?.body ??
        (counter
          ? "Сотрудник банка предложил другие условия"
          : "Заявка одобрена сотрудником банка"),
      offer: {
        amount,
        termMonths,
        ratePercent: ratePct,
        monthlyPayment: annuityPayment(amount, termMonths, ratePct),
      },
      factors,
      advice,
    };
  }
  if (application.status === "REJECTED" || application.status === "CANCELLED") {
    return {
      outcome: "rejected",
      decidedAt: application.updatedAt,
      summary:
        application.clientComments.at(-1)?.body ??
        scoring.reasons[0] ??
        "Банк отказал в заявке",
      offer: null,
      factors,
      advice,
    };
  }
  if (
    scoring.recommendation === "request_info" ||
    scoring.recommendation === "manual_review"
  ) {
    return null;
  }
  const outcome =
    scoring.recommendation === "counter_offer"
      ? "counter_offer"
      : scoring.recommendation === "reject"
        ? "rejected"
        : "approved";
  return {
    outcome,
    decidedAt: application.updatedAt,
    summary:
      scoring.reasons[0] ?? "Решение сформировано по результатам проверки",
    offer:
      outcome === "rejected"
        ? null
        : {
            amount: application.amount,
            termMonths: application.termMonths,
            ratePercent: 0,
            monthlyPayment: 0,
          },
    factors,
    advice,
  };
}

function requestsOf(application: ApiApplication): Application["requests"] {
  if (application.requestedInfo.length === 0) {
    return [];
  }
  return [
    {
      id: `request-${application.id}`,
      createdAt: application.updatedAt,
      question: application.requestedInfo.join("; "),
      why: tx.bankRequest.why,
      documentKind: null,
      answer: application.clientReply,
    },
  ];
}

/** Этап сделки в кабинете по публичному статусу; ACCEPTED значит, что договор ещё готовится. */
const dealStages: Partial<
  Record<ApiApplication["status"], NonNullable<Application["deal"]>["stage"]>
> = {
  ACCEPTED: "offer",
  SIGNING: "signing",
  FUNDED: "done",
};

function dealOf(application: ApiApplication): Application["deal"] {
  const { deal, offer } = application;
  const stage = dealStages[application.status];
  if (!deal || !offer || !stage) {
    return null;
  }
  return {
    stage,
    terms: {
      amount: offer.amount,
      termMonths: offer.termMonths,
      ratePercent: offer.ratePct,
      monthlyPayment: annuityPayment(
        offer.amount,
        offer.termMonths,
        offer.ratePct,
      ),
    },
    acceptedAt: deal.acceptedAt,
    signedAt: deal.signedAt,
    disbursedAt: deal.disbursedAt,
    account: deal.account,
  };
}

export function toProductCatalog(catalog: ApiProductCatalog): ProductCatalog {
  return {
    keyRate: catalog.keyRate,
    keyRateDate: catalog.keyRateDate,
    products: catalog.products,
  };
}

export function toCabinetApplication(
  application: ApiApplication,
  session: DemoSession,
): Application {
  const company = session.account.company;
  return {
    id: application.id,
    number: application.number,
    purpose: application.purpose,
    productId: application.productId,
    amount: application.amount,
    termMonths: application.termMonths,
    comment: "",
    financials: session.account.knownFinancials,
    documents: [],
    consents: { bki: true, personalData: true },
    status: statusOf(application),
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    company,
    checksPassed: application.scoring ? 3 : 0,
    scoring: application.scoring,
    requests: requestsOf(application),
    decision: decisionOf(application),
    deal: dealOf(application),
    urgentRequest: application.urgentRequest,
    urgentBy: application.urgentBy,
    events: [],
  };
}

export function toCompanyProfile(
  response: CompanyProfileResponse,
): CompanyProfile {
  return {
    inn: response.profile.inn,
    ogrn: response.profile.ogrn,
    form: response.profile.legalForm,
    name: response.profile.name,
    registeredAt: response.profile.registeredAt,
    okved: response.profile.okved,
    okvedName: response.profile.okved,
    address: response.profile.address,
    head: response.profile.director,
  };
}
