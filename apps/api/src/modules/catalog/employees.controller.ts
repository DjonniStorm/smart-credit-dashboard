import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodSerializerDto } from "nestjs-zod";

import { employeeSchema } from "@repo/contracts/application";

import { DemoDataStore } from "../../common/demo-data/demo-data.store.ts";

class EmployeesDto extends createZodDto(employeeSchema.array()) {}

@Controller("v1/employees")
export class EmployeesController {
  constructor(private readonly data: DemoDataStore) {}

  @Get()
  @ApiOperation({ operationId: "EmployeesController_list" })
  @ApiOkResponse({ type: EmployeesDto })
  @ZodSerializerDto(EmployeesDto)
  list(): Promise<EmployeesDto> {
    return this.data.listEmployees();
  }
}
