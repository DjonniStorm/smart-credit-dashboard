import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ZodSerializerDto, createZodDto } from "nestjs-zod";

import { managerReportResponseSchema } from "@repo/contracts/reports";

import { EmployeeSessionGuard } from "../auth/employee-session.guard.ts";
import { ReportsService } from "./reports.service.ts";

class ManagerReportDto extends createZodDto(managerReportResponseSchema) {}

@Controller("v1/reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("manager")
  @UseGuards(EmployeeSessionGuard)
  @ApiOperation({ operationId: "ReportsController_manager" })
  @ApiOkResponse({ type: ManagerReportDto })
  @ApiUnauthorizedResponse({ description: "Нет сессии сотрудника" })
  @ZodSerializerDto(ManagerReportDto)
  manager(@Query() query: Record<string, unknown>): Promise<ManagerReportDto> {
    return this.reports.getManagerReport(query);
  }
}
