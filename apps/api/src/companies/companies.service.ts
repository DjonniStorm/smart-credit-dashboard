import { BadGatewayException, Injectable } from "@nestjs/common";
import type {
  BkiReport,
  CompanyCheckResponse,
  EgrulRecord,
  FnsProfile,
  ScoreRequest,
  ScoreResponse,
} from "@repo/contracts";
import { config } from "../config.ts";

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
  async check(inn: string): Promise<CompanyCheckResponse> {
    const id = encodeURIComponent(inn);
    const [egrul, bki, fns] = await Promise.all([
      request<EgrulRecord>(`${config.mocksUrl}/egrul/${id}`),
      request<BkiReport>(`${config.mocksUrl}/bki/${id}`),
      request<FnsProfile>(`${config.mocksUrl}/fns/${id}`),
    ]);

    const body: ScoreRequest = { inn, egrul, bki, fns };
    const scoring = await request<ScoreResponse>(
      `${config.scoringUrl}/v1/score`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    return { inn, sources: { egrul, bki, fns }, scoring };
  }
}
