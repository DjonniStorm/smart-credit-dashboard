import { Controller, Get, Module, Param } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";

import {
  CompanyCheckDto,
  InnParamDto,
} from "../../modules/companies/dto/company-check.dto.ts";
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
}

@Module({
  controllers: [HealthController, CompaniesController],
})
export class OpenApiDumpModule {}
