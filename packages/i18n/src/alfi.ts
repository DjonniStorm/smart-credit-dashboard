import { Locale } from "./locale.ts";

// Тексты помощника Альфи и бренда: общие для кабинета и АРМ.
// Английской версии пока нет: en отдаёт ru.

const ru = {
  brand: {
    name: "Альфи-Банк",
    story: "Альфи-Банк назван в честь Альфи.",
  },
  loadError: {
    title: "Не получилось загрузить заявки",
    message: (reason: string) =>
      `Подсказка появится, когда данные загрузятся. Ответ сервера: ${reason}`,
  },
  dock: {
    region: "Подсказка Альфи",
    hide: "Скрыть Альфи",
    show: "Показать подсказку Альфи",
    fresh: (title: string) => `Новая подсказка Альфи: ${title}`,
  },
  cabinet: {
    showNextStep: "Показать, где это",
    showDecision: "Показать решение",
    openApplication: "Открыть заявку",
    toSigning: "Перейти к подписанию",
    continueDraft: "Продолжить заявку",
    submit: "Подать заявку",
    myApplications: "Мои заявки",
    newApplication: {
      title: "Заполните заявку по шагам",
      message:
        "Сумму и срок можно менять до отправки. В банк заявка уходит только после вашего подтверждения.",
    },
    signing: {
      title: "Подписание договора",
      message: "Запросите код и введите его, чтобы подписать договор.",
    },
    needsClient: {
      title: "Банк ждёт ваш ответ",
      fallback: "Банку нужно уточнение по заявке.",
    },
    counterOffer: {
      title: "Банк предложил другие условия",
      message: "Сравните их с вашим запросом, затем примите или откажитесь.",
    },
    approved: {
      signingTitle: "Осталось подписать договор",
      signedTitle: "Договор подписан",
      title: "Заявка одобрена",
    },
    inReview: {
      title: "Банк проверяет заявку",
      message: (passed: number) =>
        `Готово проверок: ${passed} из 3. Делать ничего не нужно, подсказка обновится, когда понадобится ваш ответ.`,
    },
    rejected: {
      title: "Банк отказал",
      message: "Причина и варианты следующего шага есть в карточке решения.",
    },
    blocked: {
      title: "Заявка на ручной проверке",
      message:
        "Сотрудник банка разбирает заявку. От вас сейчас ничего не нужно.",
    },
    disbursed: {
      title: "Кредит выдан",
      message: "Условия и история решения остаются в этой заявке.",
    },
    draft: { title: "Заявка ещё не отправлена" },
    waiting: {
      title: (number: string) => `Нужно ваше действие по ${number}`,
    },
    empty: {
      title: "Начните с заявки",
      message:
        "Выберите продукт и укажите сумму и срок. Проверку компании банк сделает сам.",
    },
    bankTurn: {
      title: "Сейчас ход за банком",
      message:
        "По вашим заявкам от вас ничего не нужно. Когда банку понадобится ответ, я покажу, где его дать.",
    },
  },
  arm: {
    showActions: "Показать действия",
    open: (number: string) => `Открыть ${number}`,
    queueEmpty: {
      title: "Ваша очередь разобрана",
      message: "Заявок, которые ждут вашего решения, сейчас нет.",
    },
    queue: {
      title: (count: number) => `Ждут вашего решения: ${count}`,
      message: (number: string) =>
        `Начните с самой старой, ${number}. Решение принимаете вы, я только подсказываю порядок.`,
    },
  },
};

export type AlfiText = typeof ru;

const dictionaries: Record<Locale, AlfiText> = {
  [Locale.Ru]: ru,
  [Locale.En]: ru,
};

export function alfiText(locale: Locale): AlfiText {
  return dictionaries[locale];
}
