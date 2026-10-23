import { Message } from "../message";

export const en = {
  [Message.CabinetTitle]: "Entrepreneur cabinet",
  [Message.CabinetDescription]:
    "Company check by INN: company registry extract, credit bureau and tax data, scoring.",
  [Message.CabinetLead]:
    "Scaffold. End-to-end path: client → api → scoring.",
  [Message.CabinetCheckTitle]: "Company check",
  [Message.CabinetCheckDescription]:
    "Enter an INN to get registry, credit bureau, tax data and a score.",
  [Message.CabinetCheckTitleInn]: "INN check {inn}",
  [Message.CabinetCheckDescriptionInn]: "Company check result for INN {inn}.",
  [Message.InnLabel]: "INN",
  [Message.InnSubmit]: "Check",
  [Message.CheckResultHeading]: "Result",
  [Message.CheckResultTitleInn]: "Result for INN {inn}",
  [Message.CheckErrorTitle]: "Error",
  [Message.CheckUnavailable]: "check unavailable",
  [Message.Loading]: "loading…",
  [Message.Retry]: "Retry",
  [Message.ArmTitle]: "Bank officer console",
  [Message.ArmDescription]:
    "Internal officer workspace: application queue and credit decision. Not for search engines.",
  [Message.ArmLead]:
    "Scaffold. Application queue and decision card will live here.",
  [Message.HealthTitle]: "API status",
  [Message.HealthUnavailable]: "API unavailable",
} as const satisfies Record<Message, string>;
