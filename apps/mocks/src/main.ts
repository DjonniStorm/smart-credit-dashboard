import Fastify from "fastify";

import type { HealthResponse } from "@repo/contracts";

import { bki, egrul, fns } from "./fixtures.ts";

type ByInn = { Params: { inn: string } };

const app = Fastify({ logger: true });
const unavailableInn = "0000000000";

function isUnavailable(inn: string): boolean {
  return inn === unavailableInn;
}

app.get("/health", async (): Promise<HealthResponse> => ({
  status: "ok",
  service: "mocks",
}));

// БКИ
app.get<ByInn>("/bki/:inn", async (req, reply) => {
  if (isUnavailable(req.params.inn)) {
    return reply
      .code(503)
      .send({ message: "Синтетический источник недоступен" });
  }
  return bki(req.params.inn);
});
// ЕГРЮЛ/ЕГРИП
app.get<ByInn>("/egrul/:inn", async (req, reply) => {
  if (isUnavailable(req.params.inn)) {
    return reply
      .code(503)
      .send({ message: "Синтетический источник недоступен" });
  }
  return egrul(req.params.inn);
});
// ФНС «Прозрачный бизнес»
app.get<ByInn>("/fns/:inn", async (req, reply) => {
  if (isUnavailable(req.params.inn)) {
    return reply
      .code(503)
      .send({ message: "Синтетический источник недоступен" });
  }
  return fns(req.params.inn);
});

const port = Number(process.env.PORT ?? 4100);
const host = process.env.HOST ?? "127.0.0.1";

await app.listen({ port, host });
