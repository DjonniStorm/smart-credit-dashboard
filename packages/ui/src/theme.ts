import {
  Badge,
  Button,
  type CSSVariablesResolver,
  Card,
  Input,
  type MantineColorsTuple,
  Modal,
  NavLink,
  NumberInput,
  Table,
  TextInput,
  type VariantColorsResolver,
  createTheme,
  defaultVariantColorsResolver,
  mergeThemeOverrides,
  virtualColor,
} from "@mantine/core";

// Значения совпадают с токенами дизайн-системы «Кредитный конвейер»
// (макеты docs/design/business.jpg и manager.jpg). Меняете токен там, меняйте и здесь.

// Светлая тема: холодная нейтральная шкала. Оттенок 7 = ink, 5 = ink-muted,
// 4 = control-border, 2 = line, 1 = bg-page, 0 = bg-rail.
const ink: MantineColorsTuple = [
  "#f7f8fa",
  "#f3f4f6",
  "#e4e7ec",
  "#c9ccd3",
  "#8c919c",
  "#5b5f6a",
  "#3a3e47",
  "#111318",
  "#0b0d10",
  "#050608",
];
// Тёмная тема: та же шкала наоборот. Оттенок 7 = ink тёмной темы.
const inkInverse: MantineColorsTuple = [
  "#101215",
  "#16181d",
  "#1d2026",
  "#30343c",
  "#6b7180",
  "#a3a8b3",
  "#c3c8d0",
  "#eceef2",
  "#f5f6f8",
  "#ffffff",
];
// Палитра, из которой Mantine красит тёмную схему: 0 текст, 2 dimmed,
// 4 границы полей, 5 разделители, 6 поля и карточки (surface), 7 фон (paper).
const dark: MantineColorsTuple = [
  "#eceef2",
  "#c3c8d0",
  "#a3a8b3",
  "#8c919c",
  "#6b7180",
  "#30343c",
  "#1d2026",
  "#101215",
  "#0b0d10",
  "#060708",
];
// Оттенок 5 = amber. Фон и текст бейджа «нужно действие» в --kk-amber-*.
const amber: MantineColorsTuple = [
  "#fff8e6",
  "#fbe9b7",
  "#f8d98a",
  "#f5cf6b",
  "#f3c24c",
  "#f2b632",
  "#d99c1a",
  "#b37f0f",
  "#8a6206",
  "#6b4a00",
];
// Фирменный красный. Оттенок 7 = brand #e3241b: кнопки и всё, на чём белый текст
// (белый на нём 4.63:1). Оттенок 6 = brand-bright #EF3124 из гайда банка:
// с белым только 4.09:1, поэтому он для логотипа и графиков.
// Оттенок 8 = brand-hover.
const red: MantineColorsTuple = [
  "#fdeeed",
  "#fbd9d6",
  "#f6b3ad",
  "#f08a82",
  "#ec5f55",
  "#f04438",
  "#ef3124",
  "#e3241b",
  "#c81f17",
  "#9a1d13",
];
// Оттенок 7 = success.
const success: MantineColorsTuple = [
  "#eefaf3",
  "#e2f5ea",
  "#b9e6cb",
  "#86d4ad",
  "#4fbf86",
  "#22a065",
  "#178a55",
  "#12804a",
  "#1f6b4a",
  "#0d4a30",
];
// Оттенок 7 = danger.
const danger: MantineColorsTuple = [
  "#fff1ef",
  "#fbe4e1",
  "#f6c4bd",
  "#ff8b7d",
  "#ec6a5b",
  "#dc4636",
  "#c8321f",
  "#b42318",
  "#8f1b12",
  "#6a140d",
];

// primary (чернила) Mantine в тёмной теме считает от инвертированной шкалы:
// subtle и light выходили тёмным на тёмном. Привязываем к токенам текста и surface-sunken.
// Цвет по умолчанию теперь red, а subtle и light без цвета остаются нейтральными:
// иначе красными стали бы все бейджи и тихие кнопки вроде «Отмены».
const variantColorResolver: VariantColorsResolver = (input) => {
  const colors = defaultVariantColorsResolver(input);
  const isQuiet =
    !input.color || input.color === "primary" || input.color === "red";
  if (isQuiet && (input.variant === "subtle" || input.variant === "light")) {
    return {
      ...colors,
      background:
        input.variant === "light" ? "var(--kk-surface-sunken)" : "transparent",
      hover: "var(--kk-surface-sunken)",
      color: "var(--mantine-color-text)",
      hoverColor: "var(--mantine-color-text)",
    };
  }
  return colors;
};

// --font-golos задаёт next/font в layout приложения.
const font =
  'var(--font-golos), system-ui, -apple-system, "Segoe UI", sans-serif';

/** Кабинет клиента: размеры md, поля и кнопки 40px, как в business.jpg. */
export const theme = createTheme({
  fontFamily: font,
  headings: {
    fontFamily: font,
    fontWeight: "700",
    sizes: {
      h1: { fontSize: "28px", lineHeight: "34px" },
      h2: { fontSize: "20px", lineHeight: "26px" },
      h3: { fontSize: "17px", lineHeight: "24px", fontWeight: "600" },
    },
  },
  fontSizes: { xs: "12px", sm: "13px", md: "14px", lg: "16px", xl: "20px" },
  lineHeights: { xs: "1.33", sm: "1.38", md: "1.43", lg: "1.38", xl: "1.3" },
  spacing: { xs: "8px", sm: "12px", md: "16px", lg: "20px", xl: "32px" },
  radius: { xs: "4px", sm: "6px", md: "8px", lg: "12px", xl: "12px" },
  defaultRadius: "md",

  colors: {
    dark,
    ink,
    inkInverse,
    amber,
    success,
    danger,
    red,
    primary: virtualColor({
      name: "primary",
      light: "ink",
      dark: "inkInverse",
    }),
  },
  // Действие красное: основная кнопка, активная навигация, фокус.
  // color="primary" по-прежнему чернила: второстепенное, текст, скоринг.
  primaryColor: "red",
  primaryShade: { light: 7, dark: 7 },
  variantColorResolver,
  autoContrast: true,
  luminanceThreshold: 0.45,
  focusRing: "auto",
  cursorType: "pointer",

  shadows: {
    // shadow-overlay: только то, что лежит поверх страницы.
    md: "0 8px 24px rgba(17, 19, 24, 0.12), 0 1px 3px rgba(17, 19, 24, 0.06)",
    // shadow-panel: правая панель заявки поверх таблицы.
    lg: "-8px 0 24px rgba(17, 19, 24, 0.06)",
  },

  components: {
    Button: Button.extend({
      defaultProps: { size: "md" },
      vars: (_theme, props) => ({
        root:
          props.size === "md"
            ? { "--button-height": "40px", "--button-padding-x": "18px" }
            : {},
      }),
    }),
    Input: Input.extend({
      vars: (_theme, props) => ({
        wrapper: props.size === "md" ? { "--input-height": "40px" } : {},
      }),
    }),
    TextInput: TextInput.extend({ defaultProps: { size: "md" } }),
    NumberInput: NumberInput.extend({
      defaultProps: {
        size: "md",
        thousandSeparator: " ",
        decimalScale: 0,
        allowNegative: false,
        suffix: " ₽",
      },
    }),
    // Mantine по умолчанию пишет бейджи капсом, в системе регистр как в предложении.
    Badge: Badge.extend({
      defaultProps: { radius: "sm", size: "lg", variant: "light" },
      styles: {
        root: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
      },
    }),
    Card: Card.extend({
      defaultProps: {
        withBorder: true,
        radius: "lg",
        padding: "lg",
        shadow: "none",
      },
      styles: {
        root: {
          borderColor: "var(--kk-line)",
          backgroundColor: "var(--kk-surface)",
        },
      },
    }),
    // Активный пункт меню: красный текст на бледно-красном, как текущее место в кабинете.
    NavLink: NavLink.extend({
      vars: () => ({
        root: {
          "--nl-bg": "var(--kk-brand-soft)",
          "--nl-color": "var(--kk-brand-text)",
        },
        children: {},
      }),
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: "lg",
        shadow: "md",
        transitionProps: { transition: "pop", duration: 200 },
      },
    }),
  },
});

/** АРМ сотрудника: та же тема, плотнее (size sm). */
export const compactTheme = mergeThemeOverrides(
  theme,
  createTheme({
    components: {
      Button: Button.extend({ defaultProps: { size: "sm" } }),
      TextInput: TextInput.extend({ defaultProps: { size: "sm" } }),
      NumberInput: NumberInput.extend({ defaultProps: { size: "sm" } }),
      Badge: Badge.extend({ defaultProps: { size: "md" } }),
      Table: Table.extend({
        defaultProps: { fz: "sm", verticalSpacing: "xs" },
      }),
    },
  }),
);

/** Семантические токены поверх переменных Mantine. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    "--mantine-color-body": "#f3f4f6",
    "--mantine-color-text": "#111318",
    "--mantine-color-dimmed": "#5b5f6a",
    "--mantine-color-default-border": "#8c919c",
    "--mantine-color-error": "#b42318",
    "--kk-bg-rail": "#f7f8fa",
    "--kk-brand": "#e3241b",
    "--kk-brand-hover": "#c81f17",
    "--kk-brand-bright": "#ef3124",
    "--kk-on-brand": "#ffffff",
    "--kk-brand-text": "#c4271c",
    "--kk-brand-soft": "#fdeeed",
    "--kk-brand-graphic": "#e3241b",
    "--kk-surface": "#ffffff",
    "--kk-surface-sunken": "#f3f4f6",
    "--kk-line": "#e4e7ec",
    "--kk-link": "#2f6bd1",
    "--kk-warning": "#a8620f",
    "--kk-chart-bar": "#d2d5db",
    "--kk-amber-soft": "#fff0de",
    "--kk-amber-ink": "#8a5a14",
    "--kk-info-soft": "#e3f1fd",
    "--kk-info-ink": "#2b5486",
    "--kk-neutral-soft": "#eceff2",
    "--kk-neutral-ink": "#4f5661",
    "--kk-success": "#12804a",
    "--kk-success-soft": "#e2f5ea",
    "--kk-success-ink": "#1f6b4a",
    "--kk-danger": "#b42318",
    "--kk-danger-soft": "#fbe4e1",
  },
  dark: {
    "--mantine-color-body": "#101215",
    "--mantine-color-text": "#eceef2",
    "--mantine-color-dimmed": "#a3a8b3",
    "--mantine-color-default-border": "#6b7180",
    "--mantine-color-error": "#ff8b7d",
    "--kk-bg-rail": "#16181d",
    "--kk-brand": "#e3241b",
    "--kk-brand-hover": "#c81f17",
    "--kk-brand-bright": "#ef3124",
    "--kk-on-brand": "#ffffff",
    "--kk-brand-text": "#ff6b5e",
    "--kk-brand-soft": "#3b1d19",
    "--kk-brand-graphic": "#ef3124",
    "--kk-surface": "#1d2026",
    "--kk-surface-sunken": "#2a2e35",
    "--kk-line": "#30343c",
    "--kk-link": "#7fb0ff",
    "--kk-warning": "#f2c38a",
    "--kk-chart-bar": "#3a3f48",
    "--kk-amber-soft": "#3a2a14",
    "--kk-amber-ink": "#f2c38a",
    "--kk-info-soft": "#16283d",
    "--kk-info-ink": "#9cc6f5",
    "--kk-neutral-soft": "#2a2e35",
    "--kk-neutral-ink": "#c3c8d0",
    "--kk-success": "#86d4ad",
    "--kk-success-soft": "#13301f",
    "--kk-success-ink": "#86d4ad",
    "--kk-danger": "#ff8b7d",
    "--kk-danger-soft": "#3b1d19",
  },
});
