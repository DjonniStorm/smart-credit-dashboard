import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  createParamDecorator,
} from "@nestjs/common";

import type { Employee } from "@repo/contracts/application";

import { AuthService } from "./auth.service.ts";
import { employeeCookieName, readCookie } from "./cookies.ts";

interface EmployeeRequest {
  headers: { cookie?: string };
  employee?: Employee;
}

/** Пускает только сотрудника с действующей сессией АРМ и кладёт его в request. */
@Injectable()
export class EmployeeSessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<EmployeeRequest>();
    request.employee = await this.auth.employeeSession(
      readCookie(request, employeeCookieName),
    );
    return Boolean(request.employee);
  }
}

export const CurrentEmployee = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Employee => {
    const request = context.switchToHttp().getRequest<EmployeeRequest>();
    if (!request.employee) {
      throw new Error("EmployeeSessionGuard не подключён к маршруту");
    }
    return request.employee;
  },
);
