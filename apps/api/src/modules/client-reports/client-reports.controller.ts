import { BadRequestException, Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiProduces, ApiQuery } from "@nestjs/swagger";
import { ZodSerializerDto, createZodDto } from "nestjs-zod";
import { clientReportDetailSchema, clientReportListSchema, clientReportQuerySchema } from "@repo/contracts/client-reports";
import type { DemoSession } from "@repo/contracts/api";

import { ClientSessionGuard, CurrentClient } from "../auth/client-session.guard.ts";
import { ClientReportsService } from "./client-reports.service.ts";

class ClientReportListDto extends createZodDto(clientReportListSchema) {}
class ClientReportDetailDto extends createZodDto(clientReportDetailSchema) {}

@Controller("v1/client-reports")
@UseGuards(ClientSessionGuard)
export class ClientReportsController {
  constructor(private readonly reports: ClientReportsService) {}

  @Get()
  @ApiOperation({ operationId: "ClientReportsController_list" })
  @ApiOkResponse({ type: ClientReportListDto })
  @ZodSerializerDto(ClientReportListDto)
  list(@CurrentClient() session: DemoSession, @Query() raw: unknown): ReturnType<ClientReportsService["list"]> {
    return this.reports.list(session, this.query(raw));
  }

  @Get("export.csv")
  @ApiOperation({ operationId: "ClientReportsController_export" })
  @ApiProduces("text/csv")
  @ApiOkResponse({
    description: "CSV-выгрузка отчётов клиента",
    content: {
      "text/csv": {
        schema: { type: "string", format: "binary" },
      },
    },
  })
  async export(@CurrentClient() session: DemoSession, @Query() raw: unknown, @Res() response: { header(name: string, value: string): void; send(body: string): void }): Promise<void> {
    response.header("Content-Type", "text/csv; charset=utf-8");
    response.header("Content-Disposition", "attachment; filename=client-reports.csv");
    response.send(await this.reports.csv(session, this.query(raw)));
  }

  @Get(":id")
  @ApiQuery({ name: "id", type: String })
  @ApiOkResponse({ type: ClientReportDetailDto })
  @ZodSerializerDto(ClientReportDetailDto)
  detail(@Param("id") id: string, @CurrentClient() session: DemoSession): ReturnType<ClientReportsService["detail"]> {
    return this.reports.detail(session, id);
  }

  private query(raw: unknown) {
    try { return clientReportQuerySchema.parse(raw); } catch { throw new BadRequestException("Некорректные параметры отчёта"); }
  }
}
