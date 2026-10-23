import { Body, Controller, Get, HttpCode, Param, Post } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { ZodSerializerDto, createZodDto } from "nestjs-zod";
import {
  apiApplicationResponseSchema,
  apiApplicationContextSchema,
  apiApplicationSchema,
  apiCheckRequestSchema,
  apiCreateApplicationSchema,
  apiJobSchema,
} from "@repo/contracts/api";
import { applicationActionRequestSchema } from "@repo/contracts/application";

import { ApplicationsService } from "./applications.service.ts";
import { ApplyApplicationActionCommand } from "./commands/apply-application-action.command.ts";

class CreateApplicationDto extends createZodDto(apiCreateApplicationSchema) {}
class CreateApplicationResponseDto extends createZodDto(apiApplicationResponseSchema) {}
class ApplicationContextDto extends createZodDto(apiApplicationContextSchema) {}
class ApplicationCheckDto extends createZodDto(apiCheckRequestSchema) {}
class ApplicationDto extends createZodDto(apiApplicationSchema) {}
class ApplicationListDto extends createZodDto(apiApplicationSchema.array()) {}
class JobDto extends createZodDto(apiJobSchema) {}
class ApplicationActionRequestDto extends createZodDto(applicationActionRequestSchema) {}

@Controller("v1/applications")
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly commands: CommandBus,
  ) {}

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

  @Get(":id/context")
  @ApiOperation({ operationId: "ApplicationsController_context" })
  @ApiOkResponse({ type: ApplicationContextDto })
  @ZodSerializerDto(ApplicationContextDto)
  async context(@Param("id") id: string): Promise<ApplicationContextDto> {
    return this.applications.getApiApplicationContext(id);
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

  @Post(":id/actions")
  @ApiOperation({ operationId: "ApplicationsController_action" })
  @ApiOkResponse({ type: ApplicationContextDto })
  @ZodSerializerDto(ApplicationContextDto)
  action(
    @Param("id") id: string,
    @Body() body: ApplicationActionRequestDto,
  ): Promise<ApplicationContextDto> {
    return this.commands.execute(new ApplyApplicationActionCommand(id, body));
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
