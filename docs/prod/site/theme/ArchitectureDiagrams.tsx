import { useEffect, useState } from "react";

import { ScreenshotSlot } from "./ScreenshotSlot";
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

type ExternalLink = {
  label: string;
  href: string;
  description: string;
};

type EvidenceSlot = {
  id: string;
  title: string;
  description: string;
  alt: string;
  group: "web" | "infrastructure";
  src?: string;
};

const externalLinks: ExternalLink[] = [
  {
    label: "Кабинет предпринимателя",
    href: "https://sales.eegov.net/login",
    description: "Создание заявки и просмотр её текущего состояния.",
  },
  {
    label: "Кабинет сотрудника банка",
    href: "https://backoffice.sales.eegov.net/login",
    description: "Проверка заявки, запрос сведений и принятие решения.",
  },
  {
    label: "Swagger API",
    href: "https://api.sales.eegov.net/docs",
    description: "Операции API, схемы запросов и ответы сервиса.",
  },
];

const evidenceSlots: EvidenceSlot[] = [
  {
    id: "client-web",
    title: "Client Web",
    description: "Экран создания заявки и её движение по статусам.",
    alt: "Скриншот Client Web",
    group: "web",
  },
  {
    id: "backoffice-web",
    title: "Backoffice Web",
    description: "Рабочее место банка для проверки и решения по заявке.",
    alt: "Скриншот Backoffice Web",
    group: "web",
  },
  {
    id: "swagger",
    title: "Swagger",
    description: "Документация API, которую можно открыть по рабочей ссылке.",
    alt: "Скриншот Swagger API",
    group: "web",
  },
  {
    id: "grafana",
    title: "Grafana",
    description: "Дашборд состояния API, сервисов и инфраструктурных метрик.",
    alt: "Скриншот Grafana",
    group: "infrastructure",
  },
];

const tabs: DiagramTab[] = [
  {
    id: "component-overview",
    label: "Компоненты",
    eyebrow: "C4 Level 2",
    title: "Кто ведёт заявку и принимает решение",
    description:
      "Предприниматель начинает заявку в Client Web, сотрудник банка проверяет её в Backoffice Web. API хранит состояние, вызывает scoring и применяет decision engine.",
    fallback: [
      "Предприниматель работает в Client Web.",
      "Сотрудник банка работает в Backoffice Web.",
      "Оба интерфейса обращаются к API по HTTP/JSON.",
      "API вызывает Scoring Service по POST /v1/score и получает score, recommendation и explainability metadata.",
      "Полный ответ включает factors, reasons, next actions, explainability и model metadata.",
      "API принимает доменное решение и пишет заявку, workflow, scoring jobs и audit в PostgreSQL.",
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
      "После HTTP-запроса API проходит guards и command handlers, проверяет переход state machine, ставит scoring job и фиксирует результат.",
    fallback: [
      "HTTP boundary передаёт команду через auth/session guards.",
      "Command handlers вызывают application workflow и state machine.",
      "QueueWorkerService забирает запись scoring_jobs внутри API с блокировкой строки PostgreSQL.",
      "Decision engine учитывает autonomy policy и результат scoring.",
      "Workflow store сохраняет транзакцию, application events и audit, reports готовят данные для просмотра.",
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
      "Схема разделяет runtime-приложения, compile-time packages, generated OpenAPI и tooling. docs/prod/site находится за пределами pnpm workspace.",
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
    title: "Как внешний запрос доходит до сервисов",
    description:
      "Caddy принимает внешний HTTPS-трафик и направляет его в client, backoffice или API. Внутри Compose API обращается к scoring и PostgreSQL, а monitoring profile проверяет контур.",
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

function LiveContour(): JSX.Element {
  return (
    <section
      className="architecture-diagrams__live"
      aria-labelledby="architecture-live-title"
    >
      <div className="architecture-diagrams__section-heading">
        <div>
          <p className="architecture-diagrams__eyebrow">Рабочий контур</p>
          <h3 id="architecture-live-title">Ссылки для проверки</h3>
        </div>
        <p>
          Эти адреса ведут в те же части продукта, которые показаны в component
          и deployment view.
        </p>
      </div>
      <div className="architecture-diagrams__live-links">
        {externalLinks.map((link) => (
          <a
            key={link.href}
            className="architecture-diagrams__live-link"
            href={link.href}
            target="_blank"
            rel="noreferrer"
          >
            <span>{link.label}</span>
            <strong>{link.href.replace("https://", "")}</strong>
            <small>{link.description}</small>
          </a>
        ))}
      </div>
    </section>
  );
}

function EvidenceSlotFigure({ slot }: { slot: EvidenceSlot }): JSX.Element {
  return (
    <ScreenshotSlot
      id={slot.id}
      title={slot.title}
      description={slot.description}
      alt={slot.alt}
      src={slot.src}
    />
  );
}

function EvidenceSection(): JSX.Element {
  const webSlots = evidenceSlots.filter((slot) => slot.group === "web");
  const infrastructureSlots = evidenceSlots.filter(
    (slot) => slot.group === "infrastructure",
  );

  return (
    <section
      className="architecture-diagrams__evidence"
      aria-labelledby="architecture-evidence-title"
    >
      <div className="architecture-diagrams__section-heading">
        <div>
          <p className="architecture-diagrams__eyebrow">
            Что показать на защите
          </p>
          <h3 id="architecture-evidence-title">Скрины рабочего контура</h3>
        </div>
        <p>
          Здесь будут реальные кадры интерфейсов и мониторинга. Пока для них
          оставлены честные места, чтобы структура страницы уже была готова.
        </p>
      </div>

      <div className="architecture-diagrams__evidence-group">
        <h4>Web-контур</h4>
        <div className="architecture-diagrams__evidence-grid">
          {webSlots.map((slot) => (
            <EvidenceSlotFigure key={slot.id} slot={slot} />
          ))}
        </div>
      </div>

      <div className="architecture-diagrams__evidence-group architecture-diagrams__evidence-group--infrastructure">
        <h4>Инфраструктура</h4>
        <div className="architecture-diagrams__evidence-grid architecture-diagrams__evidence-grid--single">
          {infrastructureSlots.map((slot) => (
            <EvidenceSlotFigure key={slot.id} slot={slot} />
          ))}
        </div>
      </div>
    </section>
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
          <p className="architecture-diagrams__eyebrow">Как проходит заявка</p>
          <h2 id="architecture-diagrams-title">
            От кабинета предпринимателя до работающего контура
          </h2>
          <p>
            Начните с component view, чтобы увидеть границы ответственности,
            затем проверьте внутренний workflow API, структуру репозитория и
            реальный deployment в Docker Compose.
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

      <LiveContour />
      <EvidenceSection />

      <noscript>
        <p className="architecture-diagrams__noscript">
          JavaScript отключён. Используйте текстовые описания внутри каждого
          пункта: они содержат границы и основные связи представления.
        </p>
      </noscript>
    </section>
  );
}
