import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";

import { PingExampleCommand } from "./ping-example.command.ts";

@CommandHandler(PingExampleCommand)
export class PingExampleHandler implements ICommandHandler<PingExampleCommand> {
  execute(command: PingExampleCommand) {
    return { source: "command" as const, echoed: command.message };
  }
}
