import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  CompanyCheckResponse,
  ScoreRequest,
  ScoreResponse,
} from "@repo/contracts";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

import type { Env } from "../../common/config/env.schema.ts";
import { DemoDataStore } from "../../common/demo-data/demo-data.store.ts";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(5_000),
  }).catch((e: unknown) => {
    throw new BadGatewayException(`${url}: ${String(e)}`);
  });
  if (!res.ok) {
    throw new BadGatewayException(`${url} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly data: DemoDataStore,
  ) {}

  async check(
    inn: string,
    application?: Pick<ApplicationWorkflow, "amount" | "termMonths">,
  ): Promise<CompanyCheckResponse> {
    const scoringUrl = this.config.getOrThrow("SCORING_URL", { infer: true });
    const sources = await this.data.getSources(inn);
    if (!sources) {
      throw new BadGatewayException(`Синтетические источники не найдены для ${inn}`);
    }
    const { egrul, bki, fns } = sources;

    const body: ScoreRequest = {
      inn,
      egrul,
      bki,
      fns,
      requestedAmount: application?.amount,
      termMonths: application?.termMonths,
    };
    const scoring = await request<ScoreResponse>(`${scoringUrl}/v1/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    return { inn, sources: { egrul, bki, fns }, scoring };
  }
}
