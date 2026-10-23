import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";

import { ApplicationsService } from "../applications.service.ts";
import { ApplyApplicationActionCommand } from "./apply-application-action.command.ts";

@CommandHandler(ApplyApplicationActionCommand)
export class ApplyApplicationActionHandler
  implements ICommandHandler<ApplyApplicationActionCommand>
{
  constructor(private readonly applications: ApplicationsService) {}

  execute(command: ApplyApplicationActionCommand) {
    return this.applications.applyAction(command.applicationId, command.input);
  }
}
