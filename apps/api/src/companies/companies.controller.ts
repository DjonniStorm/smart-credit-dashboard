import { Controller, Get, Param } from "@nestjs/common";
import { CompaniesService } from "./companies.service.js";
import { CompanyCheckDto } from "./company-check.dto.js";

@Controller("v1/companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  /** Сквозная проверка: данные из mocks (ЕГРЮЛ, БКИ, ФНС) и оценка scoring. */
  @Get(":inn/check")
  check(@Param("inn") inn: string): Promise<CompanyCheckDto> {
    return this.companies.check(inn);
  }
}
