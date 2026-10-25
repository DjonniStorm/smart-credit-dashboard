import { useEffect, useState } from "react";

import {
  type ArchitectureDiagramId,
  diagramSvgs,
} from "./generated/architecture-diagrams";

type DiagramTab = {
  id: ArchitectureDiagramId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  fallback: string[];
  routeLabel: string;
  route: string[];
};

type DiagramFrameProps = {
  src: string;
  title: string;
  description: string;
  route?: string[];
  activeStep: number;
};

const tabs: DiagramTab[] = [
  {
    id: "component-overview",
    label: "Компоненты",
    eyebrow: "C4 Level 2",
    title: "Кто с кем разговаривает",
    description:
      "Внешняя граница системы: два web-интерфейса обращаются к API, API вызывает scoring и сохраняет данные в PostgreSQL.",
    fallback: [
      "Предприниматель работает в Client Web.",
      "Сотрудник банка работает в Backoffice Web.",
      "Оба интерфейса обращаются к API по HTTP/JSON.",
      "API вызывает Scoring Service по POST /v1/score и пишет в PostgreSQL через SQL/TypeORM.",
    ],
    routeLabel: "Маршрут заявки",
    route: [
      "Client Web",
      "API",
      "Scoring Service",
      "Decision engine",
      "PostgreSQL",
    ],
  },
  {
    id: "api-internals",
    label: "API внутри",
    eyebrow: "C4 Level 3",
    title: "Как API проводит заявку через workflow",
    description:
      "Внутри API видны guards, команды, state machine, очередь scoring_jobs, decision engine, audit и отчёты.",
    fallback: [
      "HTTP boundary передаёт команду через auth/session guards.",
      "Command handlers вызывают application workflow и state machine.",
      "QueueWorkerService забирает запись scoring_jobs внутри API.",
      "Decision engine учитывает autonomy policy, а workflow store сохраняет транзакцию и audit.",
    ],
    routeLabel: "Путь решения",
    route: [
      "HTTP boundary",
      "Guards",
      "Command handler",
      "scoring_jobs",
      "Decision engine",
      "Audit",
    ],
  },
  {
    id: "repository",
    label: "Репозиторий",
    eyebrow: "Flowchart",
    title: "Где живут приложения и контракты",
    description:
      "Workspace imports, generated OpenAPI flow и tooling показаны отдельно от runtime-сервисов. docs/prod/site остаётся внешней границей.",
    fallback: [
      "apps/client, apps/backoffice и apps/api используют shared packages через workspace imports.",
      "apps/scoring остаётся workspace-приложением без зависимости от packages/*.",
      "contracts порождает generated OpenAPI flow для sdk.",
      "docs/prod/site не входит в pnpm workspace и хранит свои SVG-артефакты.",
    ],
    routeLabel: "Поток генерации",
    route: [
      "apps/api",
      "packages/contracts",
      "generated OpenAPI",
      "packages/sdk",
      "Client Web",
    ],
  },
  {
    id: "deployment",
    label: "Развёртывание",
    eyebrow: "C4 Deployment",
    title: "Как Compose собирает рабочий контур",
    description:
      "Браузер приходит на Caddy, дальше запросы идут к UI или API внутри Docker Compose network. Monitoring profile показан рядом с runtime.",
    fallback: [
      "Browser actors входят через Caddy на Docker host.",
      "Caddy маршрутизирует UI к client:3000 и backoffice:3001, API и Swagger к api:4000.",
      "API обращается к scoring:8000 и postgres:5432.",
      "Prometheus собирает metrics и probes, Grafana читает Prometheus HTTP API.",
    ],
    routeLabel: "Monitoring flow",
    route: [
      "Prometheus",
      "API /metrics",
      "blackbox-exporter",
      "Service /health",
      "Grafana",
    ],
  },
];

function openDiagram(
  id: ArchitectureDiagramId,
  behavior: ScrollBehavior = "smooth",
): void {
  const target = document.getElementById(`architecture-${id}`);
  if (!(target instanceof HTMLDetailsElement)) {
    return;
  }

  document
    .querySelectorAll<HTMLDetailsElement>(".architecture-diagrams__card")
    .forEach((card) => {
      card.open = card === target;
    });
  history.replaceState(null, "", `#architecture-${id}`);
  target.scrollIntoView({ behavior, block: "start" });
  const summary = target.querySelector("summary");
  if (summary instanceof HTMLElement) {
    summary.focus({ preventScroll: true });
  }
}

function DiagramFrame({
  src,
  title,
  description,
  route = [],
  activeStep,
}: DiagramFrameProps): JSX.Element {
  const routeStep = activeStep >= 0 ? route[activeStep] : undefined;

  return (
    <figure className="architecture-diagram__figure">
      <div
        className={`architecture-diagram__canvas${routeStep ? " is-route-active" : ""}`}
        tabIndex={0}
        role="region"
        aria-label={`${title}. ${description}`}
        data-route-step={activeStep >= 0 ? activeStep : undefined}
        dangerouslySetInnerHTML={{ __html: src }}
      />
      <p className="architecture-diagram__scroll-hint">
        На узком экране схему можно прокручивать внутри блока.
      </p>
      <figcaption>
        <strong>{title}</strong>
        <span>{description}</span>
      </figcaption>
      <p className="architecture-diagram__canvas-note" aria-live="polite">
        {routeStep
          ? `Текущий шаг маршрута: ${routeStep}.`
          : "Схема статична по умолчанию. Маршрут подсвечивается только по кнопке ниже."}
      </p>
    </figure>
  );
}

function DiagramCard({
  tab,
  defaultOpen,
}: {
  tab: DiagramTab;
  defaultOpen: boolean;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeStep, setActiveStep] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === `architecture-${tab.id}`) {
      setIsOpen(true);
      window.setTimeout(() => {
        openDiagram(tab.id, "auto");
      }, 100);
    }
  }, [tab.id]);

  useEffect(() => {
    if (!isAnimating) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveStep((value) => {
        if (value >= tab.route.length - 1) {
          setIsAnimating(false);
          return value;
        }
        return value + 1;
      });
    }, 850);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAnimating, tab.route.length]);

  function runRoute(): void {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setActiveStep(reducedMotion ? tab.route.length - 1 : 0);
    setIsAnimating(!reducedMotion);
  }

  return (
    <details
      id={`architecture-${tab.id}`}
      className="architecture-diagrams__card"
      open={isOpen}
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
    >
      <summary>
        <span className="architecture-diagrams__card-index">
          {String(tabs.indexOf(tab) + 1).padStart(2, "0")}
        </span>
        <span className="architecture-diagrams__card-meta">
          <span className="architecture-diagrams__eyebrow">{tab.eyebrow}</span>
          <strong>{tab.label}</strong>
        </span>
        <span className="architecture-diagrams__card-title">{tab.title}</span>
      </summary>

      <div className="architecture-diagrams__card-body">
        <div className="architecture-diagrams__panel-heading">
          <p>{tab.description}</p>
          <button
            type="button"
            className="architecture-diagrams__route-button"
            onClick={runRoute}
          >
            {isAnimating ? "Маршрут запущен" : `Показать: ${tab.routeLabel}`}
          </button>
        </div>

        <DiagramFrame
          src={diagramSvgs[tab.id]}
          title={tab.title}
          description={tab.description}
          route={tab.route}
          activeStep={activeStep}
        />

        <ol
          className="architecture-diagrams__route"
          aria-label={tab.routeLabel}
          aria-live="polite"
        >
          {tab.route.map((step, index) => (
            <li
              key={step}
              className={
                index === activeStep
                  ? "is-current"
                  : index < activeStep
                    ? "is-past"
                    : ""
              }
              aria-current={index === activeStep ? "step" : undefined}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>

        <div className="architecture-diagrams__legend" aria-label="Легенда">
          <span>
            <i className="architecture-diagrams__legend-shape architecture-diagrams__legend-shape--service" />{" "}
            service / container
          </span>
          <span>
            <i className="architecture-diagrams__legend-shape architecture-diagrams__legend-shape--database" />{" "}
            database
          </span>
          <span>
            <i className="architecture-diagrams__legend-line architecture-diagrams__legend-line--runtime" />{" "}
            runtime
          </span>
          <span>
            <i className="architecture-diagrams__legend-line architecture-diagrams__legend-line--compile" />{" "}
            compile-time / generated
          </span>
        </div>
        <div
          className="architecture-diagrams__fallback"
          aria-label={`Текстовое описание: ${tab.label}`}
        >
          <h4>Текстовое описание</h4>
          <ul>
            {tab.fallback.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}

export function ArchitectureDiagrams(): JSX.Element {
  return (
    <section
      className="architecture-diagrams"
      aria-labelledby="architecture-diagrams-title"
    >
      <div className="architecture-diagrams__intro">
        <div>
          <p className="architecture-diagrams__eyebrow">
            Архитектура в четырёх срезах
          </p>
          <h2 id="architecture-diagrams-title">
            Одна система, четыре полезных масштаба
          </h2>
          <p>
            Каждый срез теперь открыт отдельным пунктом. Можно развернуть только
            нужную схему, изучить её связи и свернуть перед переходом к
            следующей.
          </p>
        </div>
        <div
          className="architecture-diagrams__scope"
          aria-label="Границы набора диаграмм"
        >
          <span>Mermaid C4</span>
          <span>SVG build-time</span>
          <span>Custom SVG state machine</span>
        </div>
      </div>

      <nav
        className="architecture-diagrams__index"
        aria-label="Представления архитектуры"
      >
        <span>Смотреть отдельно:</span>
        {tabs.map((tab, index) => (
          <a
            key={tab.id}
            href={`#architecture-${tab.id}`}
            onClick={(event) => {
              event.preventDefault();
              openDiagram(tab.id);
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {tab.label}
          </a>
        ))}
      </nav>

      <div className="architecture-diagrams__cards">
        {tabs.map((tab, index) => (
          <DiagramCard key={tab.id} tab={tab} defaultOpen={index === 0} />
        ))}
      </div>

      <noscript>
        <p className="architecture-diagrams__noscript">
          JavaScript отключён. Используйте текстовые описания внутри каждого
          пункта: они содержат границы и основные связи представления.
        </p>
      </noscript>
    </section>
  );
}
