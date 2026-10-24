import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  createParamDecorator,
} from "@nestjs/common";

import type { DemoSession } from "@repo/contracts/api";

import { AuthService } from "./auth.service.ts";
import { cookieName, readCookie } from "./cookies.ts";

interface ClientRequest {
  headers: { cookie?: string };
  clientSession?: DemoSession;
}

/** Пускает только клиента с действующей демо-сессией кабинета и кладёт её в request. */
@Injectable()
export class ClientSessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ClientRequest>();
    request.clientSession = await this.auth.session(
      readCookie(request, cookieName),
    );
    return true;
  }
}

export const CurrentClient = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DemoSession => {
    const request = context.switchToHttp().getRequest<ClientRequest>();
    if (!request.clientSession) {
      throw new Error("ClientSessionGuard не подключён к маршруту");
    }
    return request.clientSession;
  },
);

export type ClientOwnedResource = { inn: string };
