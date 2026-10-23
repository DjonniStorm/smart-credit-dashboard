import { Module } from "@nestjs/common";

import { DemoDataStore } from "./demo-data.store.ts";

@Module({
  providers: [DemoDataStore],
  exports: [DemoDataStore],
})
export class DemoDataModule {}
