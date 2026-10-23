import { Module } from "@nestjs/common";

import { PingExampleHandler } from "./commands/ping-example.handler.ts";
import { ExampleController } from "./example.controller.ts";
import { GetExampleHandler } from "./queries/get-example.handler.ts";

@Module({
  controllers: [ExampleController],
  providers: [GetExampleHandler, PingExampleHandler],
})
export class ExampleModule {}
