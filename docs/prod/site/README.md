# Сайт документации

Самостоятельный статический сайт на Rspress. Для разработки нужны Node.js 24 и npm.

```bash
npm ci
npm run dev
```

Проверка готовых SVG и production-сборка сайта:

```bash
npm run build
npm run preview
```

Rspress складывает сайт в `doc_build/`. Production-сборка использует SVG и generated TypeScript-индекс, уже сохранённые в репозитории; она не запускает Mermaid CLI или Chromium.

Если меняются исходники `.mmd`, обновите артефакты локально и проверьте воспроизводимость:

```bash
npm run diagrams:build
npm run diagrams:check
npm run build
```

`diagrams:check:artifacts` проверяет соответствие исходников, хэшей, SVG и generated-индекса без запуска браузера. Полный `diagrams:check` повторно рендерит SVG pinned-версией Mermaid CLI и нужен при изменении диаграмм.

## Публикация в Vercel

Создайте отдельный Vercel Project для этого репозитория и задайте Root Directory `docs/prod/site`. `vercel.json` задаёт установку через `npm ci`, команду сборки и каталог `doc_build`. На Vercel используются заранее созданные и сохранённые в Git диаграммы, поэтому системные библиотеки Chromium в сборщике не нужны. Игнорируемая команда пропускает сборку, если в коммите нет изменений внутри корня сайта.

Сайт не использует переменные окружения, серверные функции или API приложения.
