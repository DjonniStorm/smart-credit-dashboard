import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { ZodSerializerDto, createZodDto } from "nestjs-zod";

import {
  apiAutonomyAuditSchema,
  apiAutonomySnapshotSchema,
  autonomyPolicyActionRequestSchema,
} from "@repo/contracts/api";
import { managerReportResponseSchema } from "@repo/contracts/reports";

import {
  CompanyCheckDto,
  InnParamDto,
} from "../../modules/companies/dto/company-check.dto.ts";
import {
  BkiConsentDto,
  CompanyProfileDto,
} from "../../modules/companies/dto/company-profile.dto.ts";
import { HealthDto } from "../../modules/health/dto/health.dto.ts";

class AutonomySnapshotDto extends createZodDto(apiAutonomySnapshotSchema) {}
class AutonomySnapshotListDto extends createZodDto(
  apiAutonomySnapshotSchema.array(),
) {}
class AutonomyAuditListDto extends createZodDto(
  apiAutonomyAuditSchema.array(),
) {}
class AutonomyPolicyActionDto extends createZodDto(
  autonomyPolicyActionRequestSchema,
) {}
class ManagerReportDto extends createZodDto(managerReportResponseSchema) {}

@Controller("health")
class HealthController {
  @Get()
  @ApiOperation({ operationId: "HealthController_check" })
  @ApiOkResponse({ type: HealthDto })
  @ZodSerializerDto(HealthDto)
  check(): HealthDto {
    return {} as HealthDto;
  }
}

@Controller("v1/companies")
class CompaniesController {
  @Get(":inn/check")
  @ApiOperation({ operationId: "CompaniesController_check" })
  @ApiParam({ name: "inn", required: true })
  @ApiOkResponse({ type: CompanyCheckDto })
  @ZodSerializerDto(CompanyCheckDto)
  check(@Param() params: InnParamDto): CompanyCheckDto {
    void params;
    return {} as CompanyCheckDto;
  }

  @Get(":inn/profile")
  @ApiOperation({ operationId: "CompaniesController_profile" })
  @ApiParam({ name: "inn", required: true })
  @ApiOkResponse({ type: CompanyProfileDto })
  @ZodSerializerDto(CompanyProfileDto)
  profile(@Param() params: InnParamDto): CompanyProfileDto {
    void params;
    return {} as CompanyProfileDto;
  }

  @Post(":inn/consents/bki")
  @ApiOperation({ operationId: "CompaniesController_grantBkiConsent" })
  @ApiParam({ name: "inn", required: true })
  @ApiBody({ type: BkiConsentDto })
  @ApiOkResponse({ type: CompanyProfileDto })
  @ZodSerializerDto(CompanyProfileDto)
  grantBkiConsent(
    @Param() params: InnParamDto,
    @Body() body: BkiConsentDto,
  ): CompanyProfileDto {
    void params;
    void body;
    return {} as CompanyProfileDto;
  }
}

@Controller("v1/autonomy")
class AutonomyController {
  @Get("policies")
  @ApiOperation({ operationId: "AutonomyController_policies" })
  @ApiOkResponse({ type: AutonomySnapshotListDto })
  @ZodSerializerDto(AutonomySnapshotListDto)
  policies(): AutonomySnapshotListDto {
    return [] as unknown as AutonomySnapshotListDto;
  }

  @Get("policies/:productId")
  @ApiOperation({ operationId: "AutonomyController_policy" })
  @ApiParam({ name: "productId", required: true, type: String })
  @ApiOkResponse({ type: AutonomySnapshotDto })
  @ZodSerializerDto(AutonomySnapshotDto)
  policy(@Param("productId") productId: string): AutonomySnapshotDto {
    void productId;
    return {} as AutonomySnapshotDto;
  }

  @Get("policies/:productId/audit")
  @ApiOperation({ operationId: "AutonomyController_audit" })
  @ApiParam({ name: "productId", required: true, type: String })
  @ApiOkResponse({ type: AutonomyAuditListDto })
  @ZodSerializerDto(AutonomyAuditListDto)
  audit(@Param("productId") productId: string): AutonomyAuditListDto {
    void productId;
    return [] as unknown as AutonomyAuditListDto;
  }

  @Post("policies/:productId/actions")
  @ApiOperation({ operationId: "AutonomyController_action" })
  @ApiParam({ name: "productId", required: true, type: String })
  @ApiBody({ type: AutonomyPolicyActionDto })
  @ApiOkResponse({ type: AutonomySnapshotDto })
  @ZodSerializerDto(AutonomySnapshotDto)
  action(
    @Param("productId") productId: string,
    @Body() body: AutonomyPolicyActionDto,
  ): AutonomySnapshotDto {
    void productId;
    void body;
    return {} as AutonomySnapshotDto;
  }
}

@Controller("v1/reports")
class ReportsController {
  @Get("manager")
  @ApiOperation({ operationId: "ReportsController_manager" })
  @ApiQuery({ name: "from", required: false, type: String })
  @ApiQuery({ name: "to", required: false, type: String })
  @ApiQuery({ name: "timezone", required: false, type: String })
  @ApiQuery({ name: "view", required: false, enum: ["overview", "journal"] })
  @ApiQuery({ name: "bucket", required: false, enum: ["day", "week"] })
  @ApiQuery({ name: "cursor", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "product", required: false, type: String, isArray: true })
  @ApiQuery({ name: "status", required: false, type: String, isArray: true })
  @ApiQuery({ name: "assignee", required: false, type: String, isArray: true })
  @ApiQuery({ name: "stage", required: false, type: String, isArray: true })
  @ApiQuery({ name: "actor", required: false, type: String, isArray: true })
  @ApiQuery({
    name: "recommendation",
    required: false,
    type: String,
    isArray: true,
  })
  @ApiQuery({ name: "autonomy", required: false, type: String, isArray: true })
  @ApiQuery({
    name: "autonomyDisposition",
    required: false,
    type: String,
    isArray: true,
  })
  @ApiQuery({ name: "sla", required: false, type: String, isArray: true })
  @ApiOkResponse({ type: ManagerReportDto })
  @ZodSerializerDto(ManagerReportDto)
  manager(): ManagerReportDto {
    return {} as ManagerReportDto;
  }
}

@Module({
  controllers: [
    HealthController,
    CompaniesController,
    AutonomyController,
    ReportsController,
  ],
})
export class OpenApiDumpModule {}
