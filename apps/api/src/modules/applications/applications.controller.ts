import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { ZodSerializerDto, createZodDto } from "nestjs-zod";
import {
  applicationCheckRequestSchema,
  applicationWorkflowSchema,
  createApplicationRequestSchema,
  createApplicationResponseSchema,
  scoringJobSchema,
} from "@repo/contracts/workflow";

import { ApplicationsService } from "./applications.service.ts";

class CreateApplicationDto extends createZodDto(createApplicationRequestSchema) {}
class CreateApplicationResponseDto extends createZodDto(createApplicationResponseSchema) {}
class ApplicationCheckDto extends createZodDto(applicationCheckRequestSchema) {}
class ApplicationDto extends createZodDto(applicationWorkflowSchema) {}
class JobDto extends createZodDto(scoringJobSchema) {}

@Controller("v1/applications")
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  @ApiOperation({ operationId: "ApplicationsController_create" })
  @ApiOkResponse({ type: CreateApplicationResponseDto })
  @ZodSerializerDto(CreateApplicationResponseDto)
  create(@Body() body: CreateApplicationDto): CreateApplicationResponseDto {
    return this.applications.create(body);
  }

  @Get(":id")
  @ApiOkResponse({ type: ApplicationDto })
  @ZodSerializerDto(ApplicationDto)
  get(@Param("id") id: string): ApplicationDto {
    return this.applications.getApplication(id);
  }

  @Post(":id/checks")
  @HttpCode(202)
  @ApiOperation({ operationId: "ApplicationsController_startCheck" })
  @ApiOkResponse({ type: JobDto })
  @ZodSerializerDto(JobDto)
  check(@Param("id") id: string, @Body() body: ApplicationCheckDto): JobDto {
    return this.applications.startCheck(id, body);
  }
}

@Controller("v1/jobs")
export class JobsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get(":id")
  @ApiOkResponse({ type: JobDto })
  @ZodSerializerDto(JobDto)
  get(@Param("id") id: string): JobDto {
    return this.applications.getJob(id);
  }
}
