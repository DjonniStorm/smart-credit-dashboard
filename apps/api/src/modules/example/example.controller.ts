import { Body, Controller, Get, Post } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { ApiOkResponse } from "@nestjs/swagger";

import { PingExampleCommand } from "./commands/ping-example.command.ts";
import { PingExampleDto } from "./dto/ping-example.dto.ts";
import { GetExampleQuery } from "./queries/get-example.query.ts";

@Controller("v1/example")
export class ExampleController {
  constructor(
    private readonly queries: QueryBus,
    private readonly commands: CommandBus,
  ) {}

  @Get()
  @ApiOkResponse({
    description: "Пример query: контроллер только шлёт в QueryBus.",
  })
  get() {
    return this.queries.execute(new GetExampleQuery());
  }

  @Post()
  @ApiOkResponse({
    description: "Пример command: контроллер только шлёт в CommandBus.",
  })
  ping(@Body() body: PingExampleDto) {
    return this.commands.execute(new PingExampleCommand(body.message));
  }
}
