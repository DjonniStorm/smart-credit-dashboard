// Команды клиента по своей заявке после решения банка.
import { z } from "zod";

import { apiApplicationSchema } from "./api.ts";
import { clientAnswerSchema } from "./application-parts.ts";
import { signRequestSchema } from "./cabinet.ts";

export const clientActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("answer_request"), answer: clientAnswerSchema }),
  z.object({ type: z.literal("accept_offer") }),
  z.object({ type: z.literal("decline_offer") }),
  z.object({ type: z.literal("request_sign_code") }),
  z.object({ type: z.literal("sign"), code: signRequestSchema.shape.code }),
  /** Запрос срочного режима (enabled=true) или его отзыв (enabled=false, пока запрос ждёт решения). */
  z.object({
    type: z.literal("set_urgent"),
    enabled: z.boolean(),
    reason: z.string().max(500).default(""),
  }),
]);
export type ClientAction = z.infer<typeof clientActionSchema>;

/** Повтор с тем же ключом возвращает результат без второго события. */
export const clientActionRequestSchema = z.object({
  action: clientActionSchema,
  idempotencyKey: z.string().min(8).max(128),
});
export type ClientActionRequest = z.infer<typeof clientActionRequestSchema>;

export const clientActionResponseSchema = z.object({
  application: apiApplicationSchema,
  /** Демо-код подписи: в прототипе вместо СМС приходит в ответе на request_sign_code. */
  demoCode: z.string().nullable(),
});
export type ClientActionResponse = z.infer<typeof clientActionResponseSchema>;
