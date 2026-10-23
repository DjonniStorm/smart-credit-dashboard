import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ZodSerializerDto, createZodDto } from "nestjs-zod";

import {
  apiApplicationContextSchema,
  apiApplicationResponseSchema,
  apiApplicationSchema,
  apiCheckRequestSchema,
  apiCreateApplicationSchema,
  apiJobSchema,
  apiQueueItemSchema,
} from "@repo/contracts/api";
import type { Employee } from "@repo/contracts/application";
import { applicationActionRequestSchema } from "@repo/contracts/workflow";

import {
  CurrentEmployee,
  EmployeeSessionGuard,
} from "../auth/employee-session.guard.ts";
import { ApplicationsService } from "./applications.service.ts";
import { ApplyApplicationActionCommand } from "./commands/apply-application-action.command.ts";

class CreateApplicationDto extends createZodDto(apiCreateApplicationSchema) {}
class CreateApplicationResponseDto extends createZodDto(
  apiApplicationResponseSchema,
) {}
class ApplicationContextDto extends createZodDto(apiApplicationContextSchema) {}
class ApplicationCheckDto extends createZodDto(apiCheckRequestSchema) {}
class ApplicationDto extends createZodDto(apiApplicationSchema) {}
class ApplicationListDto extends createZodDto(apiApplicationSchema.array()) {}
class QueueDto extends createZodDto(apiQueueItemSchema.array()) {}
class ApplicationActionDto extends createZodDto(
  applicationActionRequestSchema,
) {}
class JobDto extends createZodDto(apiJobSchema) {}

@Controller("v1/applications")
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly commands: CommandBus,
  ) {}

  @Get("queue")
  @UseGuards(EmployeeSessionGuard)
  @ApiOperation({ operationId: "ApplicationsController_queue" })
  @ApiOkResponse({ type: QueueDto })
  @ApiUnauthorizedResponse({ description: "Нет сессии сотрудника" })
  @ZodSerializerDto(QueueDto)
  queue(): Promise<QueueDto> {
    return this.applications.listQueue();
  }

  @Post(":id/actions")
  @HttpCode(200)
  @UseGuards(EmployeeSessionGuard)
  @ApiOperation({ operationId: "ApplicationsController_act" })
  @ApiOkResponse({ type: ApplicationContextDto })
  @ApiUnauthorizedResponse({ description: "Нет сессии сотрудника" })
  @ApiForbiddenResponse({ description: "Лимит одобрения или роль" })
  @ApiConflictResponse({
    description: "Переход запрещён статусом, паузой или блокировкой",
  })
  @ZodSerializerDto(ApplicationContextDto)
  async act(
    @Param("id") id: string,
    @Body() body: ApplicationActionDto,
    @CurrentEmployee() employee: Employee,
  ): Promise<ApplicationContextDto> {
    return this.commands.execute(
      new ApplyApplicationActionCommand(id, body, employee),
    );
  }

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
  async create(
    @Body() body: CreateApplicationDto,
  ): Promise<CreateApplicationResponseDto> {
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
  async check(
    @Param("id") id: string,
    @Body() body: ApplicationCheckDto,
  ): Promise<JobDto> {
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
