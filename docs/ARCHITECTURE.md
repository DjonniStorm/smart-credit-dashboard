### Архитектура
- Требования описаны в `REQUIREMENTS.md`
- Установка базового шаблона - `pnpm dlx create-turbo@latest`. Команды в `TURBO.md`
Архитектура является монорепозиторием с множеством packages в рамках JS-воркспейса с использованием оркестратора тасок Turborepo и пакетного менеджера pnpm.

Структура репозитория:

alfa-future/
├── apps/
│   ├── client/          # кабинет предпринимателя (бывший web)
│   ├── backoffice/      # АРМ сотрудника банка (бывший docs)
│   ├── api/             # заявки, статусы, кредитное решение, БД
│   ├── scoring/         # Python: оценка риска (правила/баллы)
│   └── mocks/           # симуляторы БКИ, ЕГРЮЛ/ЕГРИП, ФНС
├── packages/
│   ├── ui/              # общие компоненты для client и backoffice
│   ├── contracts/       # типы API, сгенерированные из OpenAPI
│   ├── eslint-config/   # из шаблона
│   └── typescript-config/  # из шаблона
├── infra/
│   ├── dev/
│   │   ├── docker-compose.yml   # только postgres для pnpm dev
│   │   └── .env.example
│   └── prod/
│       ├── docker-compose.yml   # все сервисы + caddy
│       ├── Caddyfile            # дефолт локалхост
│       └── .env.example         # секреты, DOMAIN; сам .env в .gitignore
├── .github/workflows/ci.yml     # проверки на push/PR: lint, check-types, build
├── docs/
│   ├── ARCHITECTURE.md  REQUIREMENTS.md  TURBO.md  TRACK.md
│   ├── diagrams/        # архитектура, диаграмма состояний, модель данных
│   └── api-collection/  # коллекция запросов (Bruno/Postman)
├── README.md            # см. внутрь
├── THIRD_PARTY_NOTICES  # см. внутрь
├── turbo.json  pnpm-workspace.yaml  package.json

в каждом apps/* свой Dockerfile, его использует infra/prod