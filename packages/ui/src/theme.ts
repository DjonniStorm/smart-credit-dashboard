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

// Значения совпадают с токенами дизайн-системы «Кредитный кабинет».
// Меняете токен там, меняйте и здесь.

// Светлая тема: чернила. Оттенок 7 = ink.
const ink: MantineColorsTuple = [
  "#f6f4ef",
  "#eceae3",
  "#d6d3ca",
  "#b9b5ab",
  "#86827a",
  "#5c5a52",
  "#3a3b3f",
  "#1b1c1f",
  "#141517",
  "#0c0d0e",
];
// Тёмная тема: та же шкала наоборот. Оттенок 7 = ink тёмной темы.
const inkInverse: MantineColorsTuple = [
  "#121314",
  "#1c1d20",
  "#27292d",
  "#3a3c40",
  "#74767c",
  "#a7a49c",
  "#c9c7c0",
  "#ecebe6",
  "#f4f3ef",
  "#ffffff",
];
// Палитра, из которой Mantine красит тёмную схему: 0 текст, 2 dimmed,
// 4 границы полей, 5 разделители, 6 поля и карточки (surface), 7 фон (paper).
const dark: MantineColorsTuple = [
  "#ecebe6",
  "#c9c7c0",
  "#a7a49c",
  "#86827a",
  "#74767c",
  "#34373b",
  "#1c1d20",
  "#121314",
  "#0e0f10",
  "#0a0a0b",
];
// Оттенок 5 = amber, 1 = amber-soft, 9 = amber-ink.
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
// Фирменный красный. Оттенок 7 = brand: кнопки и всё, на чём белый текст
// (белый на нём 4.97:1). Оттенок 6 = brand-bright #EF3124 из гайда банка:
// с белым только 4.09:1, поэтому он для графиков и крупных элементов без текста.
// Оттенок 8 = brand-hover.
const red: MantineColorsTuple = [
  "#fff3f2",
  "#ffe1de",
  "#ffc4be",
  "#ff9e94",
  "#ff7366",
  "#f5493d",
  "#ef3124",
  "#d62b1f",
  "#bd2418",
  "#9a1d13",
];
// Оттенок 7 = success.
const success: MantineColorsTuple = [
  "#eef8f6",
  "#dcefec",
  "#b4dfd9",
  "#86ccc4",
  "#5ccfc4",
  "#2a9c93",
  "#13847d",
  "#0b6e69",
  "#08544f",
  "#053a37",
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

/** Кабинет клиента: размеры md, цели нажатия 44px. */
export const theme = createTheme({
  fontFamily: font,
  headings: {
    fontFamily: font,
    fontWeight: "600",
    sizes: {
      h1: { fontSize: "28px", lineHeight: "34px" },
      h2: { fontSize: "22px", lineHeight: "28px" },
      h3: { fontSize: "18px", lineHeight: "24px" },
    },
  },
  fontSizes: { xs: "12px", sm: "14px", md: "16px", lg: "18px", xl: "22px" },
  lineHeights: { xs: "1.33", sm: "1.43", md: "1.5", lg: "1.33", xl: "1.27" },
  spacing: { xs: "8px", sm: "12px", md: "16px", lg: "24px", xl: "40px" },
  radius: { xs: "4px", sm: "4px", md: "8px", lg: "14px", xl: "14px" },
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
    md: "0 8px 24px rgba(27, 28, 31, 0.14), 0 1px 3px rgba(27, 28, 31, 0.08)",
  },

  components: {
    Button: Button.extend({
      defaultProps: { size: "md" },
      vars: (_theme, props) => ({
        root:
          props.size === "md"
            ? { "--button-height": "44px", "--button-padding-x": "18px" }
            : {},
      }),
    }),
    Input: Input.extend({
      vars: (_theme, props) => ({
        wrapper: props.size === "md" ? { "--input-height": "44px" } : {},
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
    "--mantine-color-body": "#f6f4ef",
    "--mantine-color-text": "#1b1c1f",
    "--mantine-color-dimmed": "#5c5a52",
    "--mantine-color-default-border": "#86827a",
    "--mantine-color-error": "#b42318",
    "--kk-brand": "#d62b1f",
    "--kk-brand-hover": "#bd2418",
    "--kk-brand-bright": "#ef3124",
    "--kk-on-brand": "#ffffff",
    "--kk-brand-text": "#d62b1f",
    "--kk-brand-soft": "#fff3f2",
    "--kk-brand-graphic": "#d62b1f",
    "--kk-surface": "#ffffff",
    "--kk-surface-sunken": "#eceae3",
    "--kk-line": "#d6d3ca",
    "--kk-amber-soft": "#fbe9b7",
    "--kk-amber-ink": "#6b4a00",
    "--kk-success": "#0b6e69",
    "--kk-success-soft": "#dcefec",
    "--kk-danger": "#b42318",
    "--kk-danger-soft": "#fbe4e1",
  },
  dark: {
    "--mantine-color-body": "#121314",
    "--mantine-color-text": "#ecebe6",
    "--mantine-color-dimmed": "#a7a49c",
    "--mantine-color-default-border": "#74767c",
    "--mantine-color-error": "#ff8b7d",
    "--kk-brand": "#d62b1f",
    "--kk-brand-hover": "#bd2418",
    "--kk-brand-bright": "#ef3124",
    "--kk-on-brand": "#ffffff",
    "--kk-brand-text": "#ff6b5e",
    "--kk-brand-soft": "#341a17",
    "--kk-brand-graphic": "#ef3124",
    "--kk-surface": "#1c1d20",
    "--kk-surface-sunken": "#27292d",
    "--kk-line": "#34373b",
    "--kk-amber-soft": "#3a2f12",
    "--kk-amber-ink": "#f5cf6b",
    "--kk-success": "#5ccfc4",
    "--kk-success-soft": "#10302d",
    "--kk-danger": "#ff8b7d",
    "--kk-danger-soft": "#3b1d19",
  },
});
