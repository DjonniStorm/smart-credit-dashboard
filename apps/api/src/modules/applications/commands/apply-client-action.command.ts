import type { DemoSession } from "@repo/contracts/api";
import type { ClientActionRequest } from "@repo/contracts/client-actions";

/** Команда клиента по своей заявке. ИНН компании берётся из сессии. */
export class ApplyClientActionCommand {
  constructor(
    readonly applicationId: string,
    readonly input: ClientActionRequest,
    readonly session: DemoSession,
  ) {}
}
