import type { ApplicationActionRequest } from "@repo/contracts/application";

export class ApplyApplicationActionCommand {
  constructor(
    readonly applicationId: string,
    readonly input: ApplicationActionRequest,
  ) {}
}
