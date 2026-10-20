import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  BkiReport,
  CompanyCheckResponse,
  EgrulRecord,
  FnsProfile,
  ScoreRequest,
  ScoreResponse,
} from "@repo/contracts";

import type { Env } from "../../common/config/env.schema.ts";

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
  constructor(private readonly config: ConfigService<Env, true>) {}

  async check(inn: string): Promise<CompanyCheckResponse> {
    const mocksUrl = this.config.getOrThrow("MOCKS_URL", { infer: true });
    const scoringUrl = this.config.getOrThrow("SCORING_URL", { infer: true });
    const id = encodeURIComponent(inn);
    const [egrul, bki, fns] = await Promise.all([
      request<EgrulRecord>(`${mocksUrl}/egrul/${id}`),
      request<BkiReport>(`${mocksUrl}/bki/${id}`),
      request<FnsProfile>(`${mocksUrl}/fns/${id}`),
    ]);

    const body: ScoreRequest = { inn, egrul, bki, fns };
    const scoring = await request<ScoreResponse>(`${scoringUrl}/v1/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    return { inn, sources: { egrul, bki, fns }, scoring };
  }
}
