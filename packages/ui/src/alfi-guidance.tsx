import { AlfiState } from "./alfi-state";

export type AlfiGuidanceContext = {
  role: "client" | "employee";
  status: string;
  stage?: string;
  waitingOn?: "client" | "employee" | "system" | "nobody";
  blocker?: string | null;
  recommendation?: "approve" | "counter_offer" | "request_info" | "reject";
  hold?: "paused" | "blocked" | null;
};

export type AlfiGuidance = {
  state: AlfiState;
  title: string;
  message: string;
  action: string | null;
  safety: string;
};

/**
 * Детерминированный fallback Альфи. Он не принимает решение и не вызывает
 * мутаций. LLM может заменить только текст message после проверки этой схемой.
 */
export function getAlfiGuidance(context: AlfiGuidanceContext): AlfiGuidance {
  if (context.hold) {
    return {
      state: AlfiState.Attention,
      title: context.hold === "blocked" ? "Заявка заблокирована" : "Заявка на паузе",
      message:
        context.blocker ??
        "Продвижение приостановлено. Сначала сотрудник должен вернуть заявку в работу.",
      action: context.role === "employee" ? "Проверьте причину и выполните «Вернуть в работу»" : null,
      safety: "Проверки и решение не пропускаются.",
    };
  }

  if (context.status === "needs_client" || context.waitingOn === "client") {
    return {
      state: AlfiState.NeedsAnswer,
      title: "Нужно действие клиента",
      message: "Банк ждёт ответ или подтверждающий документ по заявке.",
      action: context.role === "client" ? "Откройте запрос и отправьте ответ" : "Проверьте срок запроса",
      safety: "Отправленный документ сначала проходит проверку.",
    };
  }

  if (context.status === "counter_offer") {
    return {
      state: AlfiState.Explain,
      title: "Готово встречное предложение",
      message: "Банк изменил сумму, срок или ставку. Сравните условия с исходным запросом.",
      action: context.role === "client" ? "Сравните условия и примите или отклоните предложение" : "Проверьте причину изменения условий",
      safety: "Предложение не становится договором до явного подтверждения клиента.",
    };
  }

  if (context.status === "approved") {
    return {
      state: AlfiState.Success,
      title: "Решение готово",
      message: "Заявка одобрена на отображаемых условиях.",
      action: context.role === "client" ? "Проверьте условия и перейдите к подписанию" : "Проверьте лимит и зафиксируйте решение",
      safety: "Решение принято по правилам продукта; условия видны до подписания.",
    };
  }

  if (context.status === "rejected") {
    return {
      state: AlfiState.Attention,
      title: "Заявка отклонена",
      message: context.blocker ?? "Банк указал причину отказа в истории заявки.",
      action: context.role === "client" ? "Откройте причину и доступные варианты следующего шага" : "Проверьте обязательную причину отказа",
      safety: "Альфи не изменяет решение и не обещает одобрение после повторной подачи.",
    };
  }

  if (context.waitingOn === "system" || context.stage === "enrichment" || context.stage === "scoring") {
    return {
      state: AlfiState.Checking,
      title: "Проверяем данные",
      message: "Система получает ответы источников и рассчитывает показатели заявки.",
      action: null,
      safety: "Недоступный источник переводит заявку на ручную проверку.",
    };
  }

  if (context.recommendation === "request_info") {
    return {
      state: AlfiState.NeedsAnswer,
      title: "Нужны уточнения",
      message: "По результатам проверки не хватает подтверждения для следующего шага.",
      action: context.role === "employee" ? "Сформируйте запрос с причиной и сроком" : "Откройте список запросов банка",
      safety: "Без подтверждения система не повышает готовность заявки автоматически.",
    };
  }

  return {
    state: AlfiState.Greeting,
    title: context.role === "client" ? "Следующий шаг рядом" : "Альфи готов помочь",
    message: "Откройте дорожную карту заявки, чтобы увидеть текущий этап и ответственного.",
    action: null,
    safety: "Альфи только объясняет процесс и не выполняет действия без подтверждения.",
  };
}

