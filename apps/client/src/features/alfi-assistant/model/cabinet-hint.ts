import type { Application } from "@repo/contracts/cabinet";
import { AlfiState } from "@repo/ui/alfi";
import type { AlfiDockHint } from "@repo/ui/alfi-dock";

import { needsClient, nextStepOf } from "@/entities/application";

/** Элементы страницы заявки, к которым ведёт кнопка «Показать». */
export const alfiTargets = {
  nextStep: "next-step",
  decision: "decision",
} as const;

const showNextStep = {
  label: "Показать, где это",
  target: alfiTargets.nextStep,
};

/** Подсказка Альфи по адресу страницы и заявкам клиента. */
export function cabinetHint(
  pathname: string,
  applications: readonly Application[],
): AlfiDockHint {
  if (pathname === "/applications/new") {
    return {
      state: AlfiState.Explain,
      title: "Заполните заявку по шагам",
      message:
        "Сумму и срок можно менять до отправки. В банк заявка уходит только после вашего подтверждения.",
    };
  }

  const opened = /^\/applications\/([^/]+)(\/sign)?$/.exec(pathname);
  const app = opened && applications.find((item) => item.id === opened[1]);
  if (app && opened[2]) {
    return {
      state: AlfiState.Explain,
      title: "Подписание договора",
      message: "Запросите код и введите его, чтобы подписать договор.",
    };
  }
  if (app) {
    return applicationHint(app);
  }

  return overviewHint(pathname, applications);
}

function applicationHint(app: Application): AlfiDockHint {
  switch (app.status) {
    case "needs_client":
      return {
        state: AlfiState.NeedsAnswer,
        title: "Банк ждёт ваш ответ",
        message:
          app.requests.find((request) => !request.answer)?.question ??
          "Банку нужно уточнение по заявке.",
        action: showNextStep,
      };
    case "counter_offer":
      return {
        state: AlfiState.Explain,
        title: "Банк предложил другие условия",
        message: "Сравните их с вашим запросом, затем примите или откажитесь.",
        action: showNextStep,
      };
    case "approved":
      if (app.deal?.stage === "signing") {
        return {
          state: AlfiState.Success,
          title: "Осталось подписать договор",
          message: nextStepOf(app),
          action: {
            label: "Перейти к подписанию",
            href: `/applications/${app.id}/sign`,
          },
        };
      }
      return {
        state: AlfiState.Success,
        title: app.deal ? "Договор подписан" : "Заявка одобрена",
        message: nextStepOf(app),
        action: app.deal ? undefined : showNextStep,
      };
    case "in_review":
      return {
        state: AlfiState.Checking,
        title: "Банк проверяет заявку",
        message: `Готово проверок: ${app.checksPassed} из 3. Делать ничего не нужно, подсказка обновится, когда понадобится ваш ответ.`,
      };
    case "rejected":
      return {
        state: AlfiState.Attention,
        title: "Банк отказал",
        message: "Причина и варианты следующего шага есть в карточке решения.",
        action: { label: "Показать решение", target: alfiTargets.decision },
      };
    case "blocked":
      return {
        state: AlfiState.Attention,
        title: "Заявка на ручной проверке",
        message:
          "Сотрудник банка разбирает заявку. От вас сейчас ничего не нужно.",
      };
    case "disbursed":
      return {
        state: AlfiState.Success,
        title: "Кредит выдан",
        message: "Условия и история решения остаются в этой заявке.",
      };
    case "draft":
      return {
        state: AlfiState.Greeting,
        title: "Заявка ещё не отправлена",
        message: nextStepOf(app),
        action: { label: "Продолжить заявку", href: "/applications/new" },
      };
  }
}

function overviewHint(
  pathname: string,
  applications: readonly Application[],
): AlfiDockHint {
  const waiting = applications.find(needsClient);
  if (waiting) {
    return {
      state: AlfiState.NeedsAnswer,
      title: `Нужно ваше действие по ${waiting.number}`,
      message: nextStepOf(waiting),
      action: { label: "Открыть заявку", href: `/applications/${waiting.id}` },
    };
  }
  if (applications.length === 0) {
    return {
      state: AlfiState.Greeting,
      title: "Начните с заявки",
      message:
        "Выберите продукт и укажите сумму и срок. Проверку компании банк сделает сам.",
      action: { label: "Подать заявку", href: "/applications/new" },
    };
  }
  return {
    state: AlfiState.Idle,
    title: "Сейчас ход за банком",
    message:
      "По вашим заявкам от вас ничего не нужно. Когда банку понадобится ответ, я покажу, где его дать.",
    action: pathname === "/" ? undefined : { label: "Мои заявки", href: "/" },
  };
}
