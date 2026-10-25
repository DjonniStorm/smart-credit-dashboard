import type { Employee } from "@repo/contracts/application";
import type { ApplicationActionRequest } from "@repo/contracts/workflow";

/** Команда сотрудника по заявке. Автор берётся из сессии, а не из тела запроса. */
export class ApplyApplicationActionCommand {
  constructor(
    readonly applicationId: string,
    readonly input: ApplicationActionRequest,
    readonly employee: Employee,
  ) {}
}
