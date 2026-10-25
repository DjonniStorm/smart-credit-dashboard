import type { EmployeeAction } from "@repo/contracts/application";
import { alfi } from "@repo/ui/alfi";

/** Альфи отвечает на успешное действие сотрудника. */
export function showActionFeedback(
  action: EmployeeAction,
  message: string,
): void {
  const options = { raw: action.type, withBorder: true };

  switch (action.type) {
    case "request_info": {
      alfi.showNeedsInfo(message, options);
      break;
    }
    case "approve":
    case "counter_offer": {
      alfi.showOfferReady(message, options);
      break;
    }
    case "reject": {
      alfi.showDocumentRejected(message, options);
      break;
    }
    default: {
      alfi.showSuccess(message, options);
    }
  }
}
