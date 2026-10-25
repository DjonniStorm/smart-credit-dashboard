import { Locale } from "./locale.ts";

const ru = {
  title: "Финансирование бизнеса",
  next: "Ваш следующий шаг",
  demo: "Демо: синтетические данные",
  newApplication: "Новая заявка",
  company: "Ваша компания",
  source: "Известные данные профиля клиента",
  turnover: "Средний месячный оборот",
  revenue: "Выручка за 12 месяцев",
  debt: "Платежи по долгам в месяц",
  noData: "Нет данных",
  companyLink: "Открыть компанию",
  sourceError: "Не удалось загрузить состояние источников",
  sourceLoading: "Проверяем состояние источников",
  consent: "Для запроса БКИ нужно ваше согласие",
  companyPending: "Часть сведений ещё проверяется",
  companyIssue: "Есть сведения, которые требуют уточнения",
  retry: "Повторить",
  list: "Ваши заявки",
  allApplications: "Все заявки",
  filters: {
    all: "Все",
    action: "Требуют действия",
    review: "На рассмотрении",
    closed: "Завершены",
  },
  inFocus: "В фокусе",
  choose: (number: string) => {
    return "Выбрать заявку " + number;
  },
  open: "Открыть",
  requested: "Запрошено",
  completed: "Все этапы пройдены",
  offered: "Предложение банка",
  months: (n: number) => {
    return n + " мес.";
  },
  autoFocus: "К ближайшему действию",
  otherActions: (n: number) => {
    return "Ещё " + n + " требуют вашего участия";
  },
  emptyFilter: "Под выбранный фильтр нет заявок",
  resetFilter: "Показать все",
  draft: "Черновик заявки",
  draftHint:
    "Продолжите заполнение с сохранённого шага. Черновик ещё не отправлен в банк.",
  continueDraft: "Продолжить черновик",
  empty: "Начните с задачи вашего бизнеса",
  emptyHint:
    "Выберите цель финансирования, сумму и срок. Покажем подходящие продукты до подачи заявки.",
  selectProduct: "Подобрать финансирование",
  requestTitle: "Ответьте на запрос банка",
  requestAction: "Ответить банку",
  signTitle: "Договор готов к подписанию",
  signHint: "Откройте договор и подпишите его, чтобы продолжить оформление.",
  signAction: "Перейти к подписанию",
  offerTitle: "Рассмотрите предложение банка",
  offerHint:
    "Сравните предложенные условия с вашим запросом и решите, подходят ли они.",
  offerAction: "Посмотреть условия",
  waitTitle: "Сейчас от вас ничего не требуется",
  blockedTitle: "Заявка на ручной проверке",
  blockedHint:
    "Банк проверяет заявку. Доступные пояснения находятся в её карточке.",
  invalidTitle: "Уточняем состояние заявки",
  invalidHint:
    "Данных для следующего действия пока недостаточно. Обновите заявки или откройте карточку.",
  fundedTitle: "Кредит выдан",
  fundedHint:
    "Посмотреть сумму, условия и результат выдачи можно в карточке заявки.",
  rejectedTitle: "Рассмотрение завершено",
  rejectedHint:
    "Причина решения и доступные дальнейшие шаги находятся в карточке заявки.",
  declinedTitle: "Вы отказались от предложения",
  declinedHint:
    "Заявка завершена. При необходимости можно выбрать другой продукт.",
  details: "Открыть заявку",
  result: "Посмотреть результат",
  loading: "Загружаем финансирование бизнеса",
  unknownProduct: "Кредитная заявка",
};

export type FinancingText = typeof ru;

const en: FinancingText = {
  title: "Business financing",
  next: "Your next step",
  demo: "Demo: synthetic data",
  newApplication: "New application",
  company: "Your business",
  source: "Known information from the customer profile",
  turnover: "Average monthly turnover",
  revenue: "Revenue over the last 12 months",
  debt: "Monthly debt payments",
  noData: "No data",
  companyLink: "Open business profile",
  sourceError: "Could not load data source status",
  sourceLoading: "Checking data source status",
  consent: "Your consent is required to request credit history",
  companyPending: "Some information is still being checked",
  companyIssue: "Some information needs clarification",
  retry: "Try again",
  list: "Your applications",
  allApplications: "All applications",
  filters: {
    all: "All",
    action: "Action required",
    review: "Under review",
    closed: "Completed",
  },
  inFocus: "Selected",
  choose: (number: string) => {
    return "Select application " + number;
  },
  open: "Open",
  requested: "Requested",
  completed: "All stages completed",
  offered: "Bank offer",
  months: (n: number) => {
    return n + (n === 1 ? " month" : " months");
  },
  autoFocus: "Go to the next action",
  otherActions: (n: number) => {
    return n + " more require your attention";
  },
  emptyFilter: "No applications match this filter",
  resetFilter: "Show all",
  draft: "Application draft",
  draftHint:
    "Continue from the saved step. The draft has not been submitted to the bank.",
  continueDraft: "Continue draft",
  empty: "Start with your business needs",
  emptyHint:
    "Choose a financing purpose, amount and term to see suitable products before applying.",
  selectProduct: "Find financing",
  requestTitle: "Respond to the bank request",
  requestAction: "Respond to the bank",
  signTitle: "The contract is ready to sign",
  signHint: "Open and sign the contract to continue.",
  signAction: "Go to signing",
  offerTitle: "Review the bank offer",
  offerHint:
    "Compare the offered terms with your request and decide whether they suit your needs.",
  offerAction: "View terms",
  waitTitle: "No action is required from you right now",
  blockedTitle: "The application is under manual review",
  blockedHint:
    "The bank is reviewing your application. Available explanations are in the application details.",
  invalidTitle: "Checking the application state",
  invalidHint:
    "There is not enough information for the next action. Refresh the applications or open the details.",
  fundedTitle: "The loan has been disbursed",
  fundedHint:
    "The amount, terms and disbursement result are in the application details.",
  rejectedTitle: "The review is complete",
  rejectedHint:
    "The reason for the decision and available next steps are in the application details.",
  declinedTitle: "You declined the offer",
  declinedHint:
    "The application is closed. You can choose another product if needed.",
  details: "Open application",
  result: "View result",
  loading: "Loading business financing",
  unknownProduct: "Loan application",
};

const dictionaries: Record<Locale, FinancingText> = {
  [Locale.Ru]: ru,
  [Locale.En]: en,
};

export function financingText(locale: Locale): FinancingText {
  return dictionaries[locale] ?? dictionaries[Locale.Ru];
}
