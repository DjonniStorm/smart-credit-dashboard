import { Body, Controller, Get, Module, Param, Post } from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";

import {
  CompanyCheckDto,
  InnParamDto,
} from "../../modules/companies/dto/company-check.dto.ts";
import {
  BkiConsentDto,
  CompanyProfileDto,
} from "../../modules/companies/dto/company-profile.dto.ts";
import { HealthDto } from "../../modules/health/dto/health.dto.ts";

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

@Module({
  controllers: [HealthController, CompaniesController],
})
export class OpenApiDumpModule {}
