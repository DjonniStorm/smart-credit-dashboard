import { Module } from "@nestjs/common";

import { DemoDataModule } from "../../common/demo-data/demo-data.module.ts";
import { CatalogController } from "./catalog.controller.ts";
import { CatalogService } from "./catalog.service.ts";
import { EmployeesController } from "./employees.controller.ts";

@Module({
  imports: [DemoDataModule],
  controllers: [CatalogController, EmployeesController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
