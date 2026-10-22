import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";

import { GrantBkiConsentCommand } from "./commands/grant-bki-consent.command.ts";
import { CompanyCheckDto, InnParamDto } from "./dto/company-check.dto.ts";
import { BkiConsentDto, CompanyProfileDto } from "./dto/company-profile.dto.ts";
import { CheckCompanyQuery } from "./queries/check-company.query.ts";
import { GetCompanyProfileQuery } from "./queries/get-company-profile.query.ts";

@Controller("v1/companies")
export class CompaniesController {
  constructor(
    private readonly queries: QueryBus,
    private readonly commands: CommandBus,
  ) {}

  /** Сквозная проверка: данные из mocks (ЕГРЮЛ, БКИ, ФНС) и оценка scoring. */
  @Get(":inn/check")
  @ApiParam({ name: "inn", required: true })
  @ApiOkResponse({ type: CompanyCheckDto })
  @ZodSerializerDto(CompanyCheckDto)
  check(@Param() params: InnParamDto): Promise<CompanyCheckDto> {
    return this.queries.execute(new CheckCompanyQuery(params.inn));
  }

  @Get(":inn/profile")
  @ApiOperation({ operationId: "CompaniesController_profile" })
  @ApiParam({ name: "inn", required: true })
  @ApiOkResponse({ type: CompanyProfileDto })
  @ZodSerializerDto(CompanyProfileDto)
  profile(@Param() params: InnParamDto): Promise<CompanyProfileDto> {
    return this.queries.execute(new GetCompanyProfileQuery(params.inn));
  }

  @Post(":inn/consents/bki")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "CompaniesController_grantBkiConsent" })
  @ApiParam({ name: "inn", required: true })
  @ApiBody({ type: BkiConsentDto })
  @ApiOkResponse({ type: CompanyProfileDto })
  @ZodSerializerDto(CompanyProfileDto)
  grantBkiConsent(
    @Param() params: InnParamDto,
    @Body() body: BkiConsentDto,
  ): Promise<CompanyProfileDto> {
    void body;
    return this.commands.execute(new GrantBkiConsentCommand(params.inn));
  }
}
