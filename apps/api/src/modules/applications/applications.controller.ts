import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { ZodSerializerDto, createZodDto } from "nestjs-zod";
import {
  apiApplicationResponseSchema,
  apiApplicationSchema,
  apiCheckRequestSchema,
  apiCreateApplicationSchema,
  apiJobSchema,
} from "@repo/contracts/api";

import { ApplicationsService } from "./applications.service.ts";

class CreateApplicationDto extends createZodDto(apiCreateApplicationSchema) {}
class CreateApplicationResponseDto extends createZodDto(apiApplicationResponseSchema) {}
class ApplicationCheckDto extends createZodDto(apiCheckRequestSchema) {}
class ApplicationDto extends createZodDto(apiApplicationSchema) {}
class ApplicationListDto extends createZodDto(apiApplicationSchema.array()) {}
class JobDto extends createZodDto(apiJobSchema) {}

@Controller("v1/applications")
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  @ApiOkResponse({ type: ApplicationDto, isArray: true })
  @ZodSerializerDto(ApplicationListDto)
  list(): Promise<ApplicationDto[]> {
    return this.applications.listApiApplications();
  }

  @Post()
  @ApiOperation({ operationId: "ApplicationsController_create" })
  @ApiOkResponse({ type: CreateApplicationResponseDto })
  @ZodSerializerDto(CreateApplicationResponseDto)
  async create(@Body() body: CreateApplicationDto): Promise<CreateApplicationResponseDto> {
    return this.applications.createApiApplication(body);
  }

  @Get(":id")
  @ApiOkResponse({ type: ApplicationDto })
  @ZodSerializerDto(ApplicationDto)
  async get(@Param("id") id: string): Promise<ApplicationDto> {
    return this.applications.getApiApplication(id);
  }

  @Post(":id/checks")
  @HttpCode(202)
  @ApiOperation({ operationId: "ApplicationsController_startCheck" })
  @ApiOkResponse({ type: JobDto })
  @ZodSerializerDto(JobDto)
  async check(@Param("id") id: string, @Body() body: ApplicationCheckDto): Promise<JobDto> {
    return this.applications.startApiCheck(id, body);
  }
}

@Controller("v1/jobs")
export class JobsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get(":id")
  @ApiOkResponse({ type: JobDto })
  @ZodSerializerDto(JobDto)
  async get(@Param("id") id: string): Promise<JobDto> {
    return this.applications.getApiJob(id);
  }
}
