import { Message } from "../message.js";

export const ru = {
  [Message.CabinetTitle]: "Кабинет предпринимателя",
  [Message.CabinetDescription]:
    "Проверка компании по ИНН: выписка ЕГРЮЛ, данные БКИ и ФНС, оценка скоринга.",
  [Message.CabinetLead]:
    "Каркас. Сквозная ручка: client → api → scoring.",
  [Message.CabinetCheckTitle]: "Проверка компании",
  [Message.CabinetCheckDescription]:
    "Введите ИНН, чтобы получить данные ЕГРЮЛ, БКИ, ФНС и оценку скоринга.",
  [Message.CabinetCheckTitleInn]: "Проверка ИНН {inn}",
  [Message.CabinetCheckDescriptionInn]:
    "Результат проверки компании с ИНН {inn}.",
  [Message.InnLabel]: "ИНН",
  [Message.InnSubmit]: "Проверить",
  [Message.CheckResultHeading]: "Результат",
  [Message.CheckResultTitleInn]: "Результат для ИНН {inn}",
  [Message.CheckErrorTitle]: "Ошибка",
  [Message.CheckUnavailable]: "проверка недоступна",
  [Message.Loading]: "загрузка…",
  [Message.Retry]: "Повторить",
  [Message.ArmTitle]: "АРМ сотрудника банка",
  [Message.ArmDescription]:
    "Внутренний кабинет сотрудника: очередь заявок и кредитное решение. Страницы не для поисковой выдачи.",
  [Message.ArmLead]: "Каркас. Здесь будет очередь заявок и карточка решения.",
  [Message.HealthTitle]: "Состояние api",
  [Message.HealthUnavailable]: "api недоступен",
} as const satisfies Record<Message, string>;
