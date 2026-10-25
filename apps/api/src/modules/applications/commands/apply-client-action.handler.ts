import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";

import { ClientActionsService } from "../client-actions.service.ts";
import { ApplyClientActionCommand } from "./apply-client-action.command.ts";

@CommandHandler(ApplyClientActionCommand)
export class ApplyClientActionHandler implements ICommandHandler<ApplyClientActionCommand> {
  constructor(private readonly actions: ClientActionsService) {}

  execute(command: ApplyClientActionCommand) {
    return this.actions.execute(
      command.applicationId,
      command.input,
      command.session,
    );
  }
}
