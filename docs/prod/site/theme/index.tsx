import {
  HomeLayout as OriginalHomeLayout,
  Layout as OriginalLayout,
} from "@rspress/core/theme-original";
import type {
  HomeLayoutProps,
  LayoutProps,
} from "@rspress/core/theme-original";

import { ScreenshotSlot } from "./ScreenshotSlot";
import "./index.css";

function HomeWorkingContour(): JSX.Element {
  return (
    <section
      className="docs-home-working-contour"
      aria-labelledby="home-working-contour-title"
    >
      <div>
        <p className="docs-home-working-contour__eyebrow">Рабочий контур</p>
        <h2 id="home-working-contour-title">Открыть продукт и API</h2>
        <p>
          Эти адреса ведут в два кабинета и опубликованную документацию API.
          Локальные инструкции и описание сценариев остаются в разделах ниже.
        </p>
      </div>
      <div className="docs-home-working-contour__links">
        <a
          href="https://sales.eegov.net/login"
          target="_blank"
          rel="noreferrer"
        >
          Кабинет предпринимателя
        </a>
        <a
          href="https://backoffice.sales.eegov.net/login"
          target="_blank"
          rel="noreferrer"
        >
          Кабинет сотрудника банка
        </a>
        <a
          href="https://api.sales.eegov.net/docs"
          target="_blank"
          rel="noreferrer"
        >
          Swagger API
        </a>
      </div>
      <ScreenshotSlot
        id="home-overview"
        title="Общий экран демонстрации"
        alt="Скриншот общего экрана демонстрации"
        description="Место для общего кадра, который связывает кабинет предпринимателя, банковское АРМ и документацию API."
      />
    </section>
  );
}

function HomeLayout(props: HomeLayoutProps): JSX.Element {
  return (
    <OriginalHomeLayout
      {...props}
      afterFeatures={
        <>
          {props.afterFeatures}
          <HomeWorkingContour />
        </>
      }
    />
  );
}

export function Layout(props: LayoutProps): JSX.Element {
  return <OriginalLayout {...props} HomeLayout={HomeLayout} />;
}

export * from "@rspress/core/theme-original";
