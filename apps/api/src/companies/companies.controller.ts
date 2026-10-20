import { Controller, Get, Param } from "@nestjs/common";
import { ApiOkResponse, ApiParam } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { CompaniesService } from "./companies.service.ts";
import { CompanyCheckDto, InnParamDto } from "./company-check.dto.ts";

@Controller("v1/companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  /** Сквозная проверка: данные из mocks (ЕГРЮЛ, БКИ, ФНС) и оценка scoring. */
  @Get(":inn/check")
  @ApiParam({ name: "inn", required: true })
  @ApiOkResponse({ type: CompanyCheckDto })
  @ZodSerializerDto(CompanyCheckDto)
  check(@Param() params: InnParamDto): Promise<CompanyCheckDto> {
    return this.companies.check(params.inn);
  }
}
