import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from "@nestjs/swagger";
import { ZodSerializerDto, createZodDto } from "nestjs-zod";

import {
  apiAutonomyAuditSchema,
  apiAutonomySnapshotSchema,
  autonomyPolicyActionRequestSchema,
} from "@repo/contracts/api";

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

@Module({
  controllers: [HealthController, CompaniesController, AutonomyController],
})
export class OpenApiDumpModule {}
