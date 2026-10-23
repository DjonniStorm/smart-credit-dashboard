import {
  ForbiddenException,
  UnprocessableEntityException,
} from "@nestjs/common";

import type { ApiProductCatalog } from "@repo/contracts/api";
import type { Employee } from "@repo/contracts/application";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

import type { CommandContext } from "./application-commands.ts";

/** Решение, расходящееся с рекомендацией решения по заявке, нужно объяснить комментарием. */
export function requireOverrideComment(
  application: ApplicationWorkflow,
  chosen: "approve" | "counter_offer" | "reject",
  comment: string,
): void {
  if (application.decision?.recommendation !== chosen && !comment.trim()) {
    throw new UnprocessableEntityException(
      "Для решения, отличающегося от рекомендации, нужен комментарий",
    );
  }
}

export function requireLimit(employee: Employee, amount: number): void {
  if (amount > employee.approvalLimit) {
    throw new ForbiddenException(
      "Сумма выше вашего лимита одобрения: передайте руководителю",
    );
  }
}

export function requireEmployee(ctx: CommandContext, id: string): void {
  if (!ctx.employeeIds.has(id)) {
    throw new UnprocessableEntityException("Сотрудник не найден");
  }
}

export function findProduct(catalog: ApiProductCatalog, id: string) {
  const product = catalog.products.find((item) => item.id === id);
  if (!product) {
    throw new UnprocessableEntityException("Продукт не найден в каталоге");
  }
  return product;
}
