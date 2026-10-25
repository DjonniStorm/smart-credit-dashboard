import { useState } from "react";
import { StateMachineDiagramVertical } from "./StateMachineDiagramVertical";

type FlowStep = {
  status: string;
  actor: string;
  title: string;
  detail: string;
  action: string;
};

const mainPath = [
  "DRAFT",
  "SUBMITTED",
  "VALIDATING",
  "UNDER_REVIEW",
  "NEEDS_INFO",
  "OFFERED",
  "ACCEPTED",
  "SIGNING",
  "FUNDED",
];

const flowSteps: FlowStep[] = [
  {
    status: "DRAFT",
    actor: "Предприниматель",
    title: "Черновик заявки",
    detail: "Компания, цель, продукт и параметры финансирования собраны в одном контексте.",
    action: "Заполнить обязательные поля и согласия",
  },
  {
    status: "SUBMITTED",
    actor: "Предприниматель",
    title: "Заявка отправлена",
    detail: "Клиент подтвердил запрос. Дальше заявку принимает кредитный конвейер.",
    action: "Передать заявку на проверку",
  },
  {
    status: "VALIDATING",
    actor: "Система",
    title: "Проверка данных",
    detail: "Система сопоставляет данные компании, источники, документы и ограничения продукта.",
    action: "Запустить проверки и scoring",
  },
  {
    status: "UNDER_REVIEW",
    actor: "Банк",
    title: "Заявка на рассмотрении",
    detail: "Менеджер видит факторы риска, готовность заявки, источники и рекомендацию системы.",
    action: "Подтвердить рекомендацию или выбрать следующий шаг",
  },
  {
    status: "NEEDS_INFO",
    actor: "Система и клиент",
    title: "Нужно уточнение",
    detail: "Расхождение не скрывается за отказом. Клиент получает понятный вопрос и способ ответа.",
    action: "Ответить и вернуть заявку в проверку",
  },
  {
    status: "OFFERED",
    actor: "Банк",
    title: "Условия готовы",
    detail: "Банк может предложить исходные условия или counter-offer с объяснением изменений.",
    action: "Показать клиенту предложение",
  },
  {
    status: "ACCEPTED",
    actor: "Предприниматель",
    title: "Условия приняты",
    detail: "Клиент сравнил условия и подтвердил выбранное предложение.",
    action: "Подготовить демонстрационное подписание",
  },
  {
    status: "SIGNING",
    actor: "Система",
    title: "Подписание",
    detail: "В прототипе подписание моделируется кодом подтверждения внутри кабинета.",
    action: "Подтвердить договор",
  },
  {
    status: "FUNDED",
    actor: "Система",
    title: "Моделируемая выдача",
    detail: "Заявка завершает основной путь. Статус относится к конкретной заявке клиента.",
    action: "Показать итог и историю решения",
  },
];

export function StateMachineDemo(): JSX.Element {
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<"journey" | "map">("map");
  const currentStep = flowSteps[stepIndex];

  function moveStep(direction: number): void {
    setStepIndex((value) => {
      const nextValue = value + direction;
      return Math.min(Math.max(nextValue, 0), flowSteps.length - 1);
    });
  }

  function reset(): void {
    setStepIndex(0);
  }

  return (
    <section className="state-machine-demo" aria-label="Интерактивная карта состояний заявки">
      <div className="state-machine-demo__topline">
        <span className="state-machine-demo__kicker">Демо-концепт</span>
        <span className="state-machine-demo__counter">
          {String(stepIndex + 1).padStart(2, "0")} / {String(flowSteps.length).padStart(2, "0")}
        </span>
      </div>

      <div className="state-machine-demo__header">
        <div>
          <h2>Заявка движется, а не исчезает в ожидании</h2>
          <p>
            Один маршрут показывает, кто действует сейчас, что меняется в системе и почему заявка переходит дальше.
          </p>
        </div>
        <div className="state-machine-demo__switcher" role="tablist" aria-label="Режим диаграммы">
          <button
            className={mode === "journey" ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={mode === "journey"}
            onClick={() => setMode("journey")}
          >
            Путь
          </button>
          <button
            className={mode === "map" ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={mode === "map"}
            onClick={() => setMode("map")}
          >
            Карта
          </button>
        </div>
      </div>

      {mode === "journey" ? (
        <div className="state-machine-demo__journey">
          <div className="state-machine-demo__rail" aria-label="Шаги основного пути">
            {mainPath.map((status, index) => (
              <div className="state-machine-demo__rail-item" key={status}>
                <button
                  className={`state-node ${index === stepIndex ? "is-current" : ""} ${index < stepIndex ? "is-past" : ""}`}
                  type="button"
                  aria-label={`Открыть состояние ${status}`}
                  aria-current={index === stepIndex ? "step" : undefined}
                  onClick={() => setStepIndex(index)}
                >
                  <span>{status}</span>
                </button>
                {index < mainPath.length - 1 ? <span className="state-connector" aria-hidden="true" /> : null}
              </div>
            ))}
          </div>

          <div className="state-machine-demo__detail">
            <div className="state-machine-demo__detail-label">
              <span>{currentStep.actor}</span>
              <strong>{currentStep.status}</strong>
            </div>
            <h3>{currentStep.title}</h3>
            <p>{currentStep.detail}</p>
            <div className="state-machine-demo__action">
              <span>Следующее действие</span>
              <strong>{currentStep.action}</strong>
            </div>
          </div>

          <div className="state-machine-demo__controls">
            <button type="button" onClick={reset} disabled={stepIndex === 0}>
              В начало
            </button>
            <button type="button" onClick={() => moveStep(-1)} disabled={stepIndex === 0}>
              Назад
            </button>
            <button type="button" className="primary" onClick={() => moveStep(1)} disabled={stepIndex === flowSteps.length - 1}>
              Следующий шаг
            </button>
          </div>
        </div>
      ) : (
        <div className="state-machine-demo__map" aria-label="Статичная карта состояний">
          <StateMachineDiagramVertical currentStatus={flowSteps[stepIndex].status} />
          <div className="state-map-legend" aria-label="Легенда диаграммы">
            <span><i className="state-map-legend__dot" /> активное состояние</span>
            <span><i className="state-map-legend__diamond" /> проверка или решение</span>
            <span><i className="state-map-legend__terminal" /> завершение пути</span>
          </div>
        </div>
      )}

      <p className="state-machine-demo__footnote">
        Данные и внешние проверки в демонстрации синтетические. Демо показывает состояние заявки, а не обещание реальной выдачи.
      </p>
    </section>
  );
}
