import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";

import { ApplicationActionsService } from "../application-actions.service.ts";
import { ApplyApplicationActionCommand } from "./apply-application-action.command.ts";

@CommandHandler(ApplyApplicationActionCommand)
export class ApplyApplicationActionHandler implements ICommandHandler<ApplyApplicationActionCommand> {
  constructor(private readonly actions: ApplicationActionsService) {}

  execute(command: ApplyApplicationActionCommand) {
    return this.actions.execute(
      command.applicationId,
      command.input,
      command.employee,
    );
  }
}
