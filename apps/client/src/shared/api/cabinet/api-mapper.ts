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

function statusOf(application: ApiApplication): Application["status"] {
  switch (application.status) {
    case "DRAFT":
      return "draft";
    case "NEEDS_INFO":
      return "needs_client";
    case "OFFERED":
      return application.offerKind === "counter" ? "counter_offer" : "approved";
    case "FUNDED":
      return "disbursed";
    case "REJECTED":
    case "CANCELLED":
      return "rejected";
    default:
      return "in_review";
  }
}

function decisionOf(application: ApiApplication): Application["decision"] {
  const scoring = application.scoring;
  if (!scoring) {
    return null;
  }
  if (scoring.recommendation === "request_info" || scoring.recommendation === "manual_review") {
    return null;
  }
  const outcome = scoring.recommendation === "counter_offer" ? "counter_offer" :
    scoring.recommendation === "reject" ? "rejected" : "approved";
  return {
    outcome,
    decidedAt: application.updatedAt,
    summary: scoring.reasons[0] ?? "Решение сформировано по результатам проверки",
    offer: outcome === "rejected"
      ? null
      : {
          amount: application.amount,
          termMonths: application.termMonths,
          ratePercent: 0,
          monthlyPayment: 0,
        },
    factors: scoring.factors.map((factor) => {
      return {
        label: factor.label,
        value: factor.value,
        source: factor.source ?? "scoring",
        effect: factor.impact >= 0 ? "positive" : "negative",
        note: "Фактор baseline scoring",
      };
    }),
    advice: scoring.nextActions[0] ?? null,
  };
}

export function toProductCatalog(catalog: ApiProductCatalog): ProductCatalog {
  return {
    keyRate: catalog.keyRate,
    keyRateDate: catalog.keyRateDate,
    products: catalog.products.map((product) => ({
      id: product.id,
      name: product.name,
      purposes: product.purposes as ProductCatalog["products"][number]["purposes"],
      description: product.description,
      minAmount: product.minAmount,
      maxAmount: product.maxAmount,
      minTermMonths: product.minTermMonths,
      maxTermMonths: product.maxTermMonths,
      spreadPp: product.spreadPp,
      collateral: product.collateral,
    })),
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
    purpose: application.purpose as Application["purpose"],
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
    requests: [],
    decision: decisionOf(application),
    deal: null,
    events: [],
  };
}

export function toCompanyProfile(response: CompanyProfileResponse): CompanyProfile {
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
