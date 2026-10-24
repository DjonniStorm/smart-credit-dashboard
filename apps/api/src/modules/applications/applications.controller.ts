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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ZodSerializerDto, createZodDto } from "nestjs-zod";

import {
  apiApplicationContextSchema,
  apiApplicationResponseSchema,
  apiApplicationSchema,
  apiAutonomyAuditSchema,
  apiAutonomySnapshotSchema,
  apiCheckRequestSchema,
  apiCreateApplicationSchema,
  apiJobSchema,
  apiQueueItemSchema,
  autonomyPolicyActionRequestSchema,
} from "@repo/contracts/api";
import type { DemoSession } from "@repo/contracts/api";
import type { Employee } from "@repo/contracts/application";
import {
  clientActionRequestSchema,
  clientActionResponseSchema,
} from "@repo/contracts/client-actions";
import { applicationActionRequestSchema } from "@repo/contracts/workflow";

import {
  ClientSessionGuard,
  CurrentClient,
} from "../auth/client-session.guard.ts";
import {
  CurrentEmployee,
  EmployeeSessionGuard,
} from "../auth/employee-session.guard.ts";
import { ApplicationsService } from "./applications.service.ts";
import { AutonomyStore } from "./autonomy.store.ts";
import { ClientApplicationsService } from "./client-applications.service.ts";
import { ApplyApplicationActionCommand } from "./commands/apply-application-action.command.ts";
import { ApplyClientActionCommand } from "./commands/apply-client-action.command.ts";

export class CreateApplicationDto extends createZodDto(
  apiCreateApplicationSchema,
) {}
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
export class ClientActionDto extends createZodDto(clientActionRequestSchema) {}
class ClientActionResponseDto extends createZodDto(
  clientActionResponseSchema,
) {}
class JobDto extends createZodDto(apiJobSchema) {}
class AutonomySnapshotDto extends createZodDto(apiAutonomySnapshotSchema) {}
class AutonomySnapshotListDto extends createZodDto(
  apiAutonomySnapshotSchema.array(),
) {}
class AutonomyAuditDto extends createZodDto(apiAutonomyAuditSchema.array()) {}
class AutonomyPolicyActionDto extends createZodDto(
  autonomyPolicyActionRequestSchema,
) {}

@Controller("v1/applications")
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly commands: CommandBus,
    private readonly clientApplications: ClientApplicationsService,
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

  @Post(":id/client-actions")
  @HttpCode(200)
  @UseGuards(ClientSessionGuard)
  @ApiOperation({ operationId: "ApplicationsController_clientAct" })
  @ApiOkResponse({ type: ClientActionResponseDto })
  @ApiUnauthorizedResponse({ description: "Нет сессии клиента" })
  @ApiNotFoundResponse({ description: "Заявки нет или она чужая" })
  @ApiConflictResponse({ description: "Переход запрещён статусом заявки" })
  @ZodSerializerDto(ClientActionResponseDto)
  async clientAct(
    @Param("id") id: string,
    @Body() body: ClientActionDto,
    @CurrentClient() session: DemoSession,
  ): Promise<ClientActionResponseDto> {
    return this.commands.execute(
      new ApplyClientActionCommand(id, body, session),
    );
  }

  @Get()
  @UseGuards(ClientSessionGuard)
  @ApiOkResponse({ type: ApplicationDto, isArray: true })
  @ZodSerializerDto(ApplicationListDto)
  list(@CurrentClient() session: DemoSession): Promise<ApplicationDto[]> {
    return this.clientApplications.list(session.account.company.inn);
  }

  @Post()
  @UseGuards(ClientSessionGuard)
  @ApiOperation({ operationId: "ApplicationsController_create" })
  @ApiOkResponse({ type: CreateApplicationResponseDto })
  @ZodSerializerDto(CreateApplicationResponseDto)
  async create(
    @Body() body: CreateApplicationDto,
    @CurrentClient() session: DemoSession,
  ): Promise<CreateApplicationResponseDto> {
    return this.clientApplications.create(body, session.account.company.inn);
  }

  @Get(":id/context")
  @UseGuards(EmployeeSessionGuard)
  @ApiOperation({ operationId: "ApplicationsController_context" })
  @ApiOkResponse({ type: ApplicationContextDto })
  @ZodSerializerDto(ApplicationContextDto)
  async context(@Param("id") id: string): Promise<ApplicationContextDto> {
    return this.applications.getApiApplicationContext(id);
  }

  @Get(":id")
  @UseGuards(ClientSessionGuard)
  @ApiOkResponse({ type: ApplicationDto })
  @ZodSerializerDto(ApplicationDto)
  async get(
    @Param("id") id: string,
    @CurrentClient() session: DemoSession,
  ): Promise<ApplicationDto> {
    return this.clientApplications.get(id, session.account.company.inn);
  }

  @Post(":id/checks")
  @UseGuards(ClientSessionGuard)
  @HttpCode(202)
  @ApiOperation({ operationId: "ApplicationsController_startCheck" })
  @ApiOkResponse({ type: JobDto })
  @ZodSerializerDto(JobDto)
  async check(
    @Param("id") id: string,
    @Body() body: ApplicationCheckDto,
    @CurrentClient() session: DemoSession,
  ): Promise<JobDto> {
    await this.clientApplications.assertAccess(id, session.account.company.inn);
    return this.applications.startApiCheck(id, body);
  }
}

@Controller("v1/jobs")
export class JobsController {
  constructor(private readonly clientApplications: ClientApplicationsService) {}

  @Get(":id")
  @UseGuards(ClientSessionGuard)
  @ApiOkResponse({ type: JobDto })
  @ZodSerializerDto(JobDto)
  async get(
    @Param("id") id: string,
    @CurrentClient() session: DemoSession,
  ): Promise<JobDto> {
    return this.clientApplications.job(id, session.account.company.inn);
  }
}

@Controller("v1/autonomy")
export class AutonomyController {
  constructor(private readonly autonomy: AutonomyStore) {}

  @Get("policies")
  @UseGuards(EmployeeSessionGuard)
  @ApiOkResponse({ type: AutonomySnapshotListDto })
  @ZodSerializerDto(AutonomySnapshotListDto)
  policies(): Promise<AutonomySnapshotDto[]> {
    return this.autonomy.listSnapshots();
  }

  @Get("policies/:productId")
  @UseGuards(EmployeeSessionGuard)
  @ApiOkResponse({ type: AutonomySnapshotDto })
  @ZodSerializerDto(AutonomySnapshotDto)
  policy(@Param("productId") productId: string): Promise<AutonomySnapshotDto> {
    return this.autonomy.getSnapshot(productId as never);
  }

  @Get("policies/:productId/audit")
  @UseGuards(EmployeeSessionGuard)
  @ApiOkResponse({ type: AutonomyAuditDto })
  @ZodSerializerDto(AutonomyAuditDto)
  audit(@Param("productId") productId: string): Promise<AutonomyAuditDto> {
    return this.autonomy.listAudit(productId as never);
  }

  @Post("policies/:productId/actions")
  @HttpCode(200)
  @UseGuards(EmployeeSessionGuard)
  @ApiOkResponse({ type: AutonomySnapshotDto })
  @ApiForbiddenResponse({ description: "Требуется роль руководителя" })
  @ZodSerializerDto(AutonomySnapshotDto)
  action(
    @Param("productId") productId: string,
    @Body() body: AutonomyPolicyActionDto,
    @CurrentEmployee() employee: Employee,
  ): Promise<AutonomySnapshotDto> {
    return this.autonomy.applyPolicyAction(productId as never, body, employee);
  }
}
