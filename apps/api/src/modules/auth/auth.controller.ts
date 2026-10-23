import { Body, Controller, Get, HttpCode, Post, Req, Res } from "@nestjs/common";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";
import { createZodDto, ZodSerializerDto } from "nestjs-zod";
import { z } from "zod";

import { demoAccountApiSchema, demoSessionSchema } from "@repo/contracts/api";

import { AuthService } from "./auth.service.ts";

const cookieName = "alfa_demo_session";

interface RequestLike {
  headers: { cookie?: string };
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): { send(): void };
}

class DemoAccountDto extends createZodDto(demoAccountApiSchema) {}
class DemoAccountListDto extends createZodDto(demoAccountApiSchema.array()) {}
class DemoSessionDto extends createZodDto(demoSessionSchema) {}
class SignInDto extends createZodDto(z.object({ accountId: z.string().min(1) })) {}

@Controller("v1/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get("demo-accounts")
  @ApiOperation({ operationId: "AuthController_demoAccounts" })
  @ApiOkResponse({ type: DemoAccountDto, isArray: true })
  @ZodSerializerDto(DemoAccountListDto)
  demoAccounts(): Promise<DemoAccountDto[]> {
    return this.auth.listAccounts();
  }

  @Get("me")
  @ApiOperation({ operationId: "AuthController_me" })
  @ApiOkResponse({ type: DemoSessionDto })
  @ZodSerializerDto(DemoSessionDto)
  me(@Req() request: RequestLike): Promise<DemoSessionDto> {
    return this.auth.session(this.cookie(request));
  }

  @Post("demo-sign-in")
  @HttpCode(200)
  @ApiOperation({ operationId: "AuthController_demoSignIn" })
  @ApiOkResponse({ type: DemoAccountDto })
  @ZodSerializerDto(DemoAccountDto)
  async signIn(
    @Body() body: SignInDto,
    @Res({ passthrough: true }) response: ResponseLike,
  ): Promise<DemoAccountDto> {
    const result = await this.auth.signIn(body.accountId);
    response.setHeader(
      "Set-Cookie",
      `${cookieName}=${result.token}; Path=/; HttpOnly; SameSite=Lax`,
    );
    return result.session.account;
  }

  @Post("sign-out")
  @HttpCode(204)
  @ApiOperation({ operationId: "AuthController_signOut" })
  async signOut(@Req() request: RequestLike, @Res() response: ResponseLike): Promise<void> {
    await this.auth.signOut(this.cookie(request));
    response.setHeader(
      "Set-Cookie",
      `${cookieName}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`,
    );
    response.status(204).send();
  }

  private cookie(request: RequestLike): string | undefined {
    const header = request.headers.cookie ?? "";
    return header
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
  }
}
