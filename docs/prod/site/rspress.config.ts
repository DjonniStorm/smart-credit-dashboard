import { defineConfig } from "@rspress/core";

export default defineConfig({
  root: "docs",
  title: "Smart Credit Dashboard",
  description:
    "Документация кабинета предпринимателя, банковского АРМ и демонстрационного контура Smart Credit Dashboard.",
  lang: "ru",
  themeConfig: {
    darkMode: "auto",
    lastUpdated: false,
    footer: {
      message: "Документация демонстрационного проекта Smart Credit Dashboard",
    },
  },
});
