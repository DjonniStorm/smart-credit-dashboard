import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
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
  @ApiQuery({ name: "from", required: false, type: String, description: "Начало периода ISO, включительно" })
  @ApiQuery({ name: "to", required: false, type: String, description: "Конец периода ISO, исключительно" })
  @ApiQuery({ name: "timezone", required: false, type: String })
  @ApiQuery({ name: "view", required: false, enum: ["overview", "journal"] })
  @ApiQuery({ name: "bucket", required: false, enum: ["day", "week"] })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number, minimum: 1, maximum: 100 })
  @ApiQuery({ name: "product", required: false, type: String, isArray: true })
  @ApiQuery({ name: "status", required: false, type: String, isArray: true })
  @ApiQuery({ name: "assignee", required: false, type: String, isArray: true })
  @ApiQuery({ name: "stage", required: false, type: String, isArray: true })
  @ApiQuery({ name: "actor", required: false, type: String, isArray: true })
  @ApiQuery({ name: "recommendation", required: false, type: String, isArray: true })
  @ApiQuery({ name: "autonomy", required: false, type: String, isArray: true })
  @ApiQuery({ name: "autonomyDisposition", required: false, type: String, isArray: true })
  @ApiQuery({ name: "sla", required: false, type: String, isArray: true })
  @ApiOkResponse({ type: ManagerReportDto })
  @ApiUnauthorizedResponse({ description: "Нет сессии сотрудника" })
  @ZodSerializerDto(ManagerReportDto)
  manager(@Query() query: Record<string, unknown>): Promise<ManagerReportDto> {
    return this.reports.getManagerReport(query);
  }
}
