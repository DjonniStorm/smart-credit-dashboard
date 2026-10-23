import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";

import type { DemoSession } from "@repo/contracts/api";
import type { Employee } from "@repo/contracts/application";

import { AuthService } from "./auth.service.ts";
import { cookieName, employeeCookieName, readCookie } from "./cookies.ts";

export type AuthenticatedActor =
  | { kind: "client"; session: DemoSession }
  | { kind: "employee"; employee: Employee };

interface AuthenticatedRequest {
  headers: { cookie?: string };
  actor?: AuthenticatedActor;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const clientToken = readCookie(request, cookieName);
    if (clientToken) {
      try {
        request.actor = {
          kind: "client",
          session: await this.auth.session(clientToken),
        };
        return true;
      } catch {
        // Сотрудник может использовать отдельную cookie-сессию АРМ.
      }
    }

    const employeeToken = readCookie(request, employeeCookieName);
    if (employeeToken) {
      request.actor = {
        kind: "employee",
        employee: await this.auth.employeeSession(employeeToken),
      };
      return true;
    }

    throw new UnauthorizedException("Войдите в систему");
  }
}

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedActor => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.actor) {
      throw new ForbiddenException("Сессия не определена");
    }
    return request.actor;
  },
);
