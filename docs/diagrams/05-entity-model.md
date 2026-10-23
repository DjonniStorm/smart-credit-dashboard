# Модель данных на уровне сущностей

Сущности и связи по `packages/contracts`, без привязки к таблицам. Физическая схема Postgres лежит в [04-data-model.md](04-data-model.md): там заявка это строка `applications`, а продукты, учётки и сотрудники это jsonb-документы.

В контрактах две формы заявки. Кабинет работает с `Application` из `cabinet.ts`, АРМ с `Application` из `application.ts`; обе строятся из `ApiApplication` (`api.ts`), который отдаёт api. Диаграмма показывает общие сущности, различия указаны в таблице под ней.

```mermaid
erDiagram
  DemoAccount ||--|| Company : "company"
  DemoAccount ||--|| Financials : "knownFinancials"
  Company ||--o{ Application : "подаёт, по inn"
  CreditProduct ||--o{ Application : "productId"
  Application ||--o{ AttachedDocument : "documents"
  Application ||--o{ ClientRequest : "requests"
  Application ||--o| Decision : "decision"
  Application ||--o| Deal : "deal"
  Application ||--o{ ApplicationEvent : "events, audit"
  Application ||--o| ScoringResult : "scoring"
  Application ||--o{ ScoringJob : "checkJobId"
  Decision ||--o| OfferTerms : "offer"
  Deal ||--|| OfferTerms : "terms"
  Employee ||--o{ Application : "assigneeId, АРМ"
  CreditProduct ||--o| AutonomyPolicy : "productId"

  DemoAccount {
    string id
    string person
    string role
    string scenario
  }
  Company {
    string inn
    string ogrn
    string form "ip или ooo"
    string name
    string okved
    string registeredAt
  }
  Financials {
    number revenueLastYear
    number avgMonthlyTurnover
    number monthlyDebtPayments
    int employees
  }
  CreditProduct {
    string id "working_capital, cash_gap, equipment, development"
    string name
    number minAmount
    number maxAmount
    int minTermMonths
    int maxTermMonths
    number spreadPp
    number maxDebtLoad
    int minBusinessAgeMonths
    string collateral
  }
  Application {
    string id
    string number
    string status
    string purpose
    number amount
    int termMonths
    string createdAt
    string updatedAt
  }
  AttachedDocument {
    string id
    string kind
    string name
  }
  ClientRequest {
    string id
    string question
    string why
  }
  Decision {
    string outcome "approved, counter_offer, rejected"
    string summary
    string advice
  }
  OfferTerms {
    number amount
    int termMonths
    number ratePercent
    number monthlyPayment
  }
  Deal {
    string stage "offer, signing, disbursing, done"
    string acceptedAt
    string signedAt
    string account
  }
  ApplicationEvent {
    string at
    string actor
    string kind
  }
  ScoringResult {
    number score
    string grade
    string riskBand
    number healthIndex
    number readinessIndex
    number confidence
    string recommendation
  }
  ScoringJob {
    string id
    string status
    int attempts
  }
  Employee {
    string id
    string name
    string role "analyst или lead"
    number approvalLimit
  }
  AutonomyPolicy {
    string level "new, verified, stable, paused"
    string policyVersion
    number closedCases
    number manualOverrideRate
  }
```

SVG: [05-entity-model.svg](05-entity-model.svg)

## Чем отличаются формы заявки

| Поле              | Кабинет (`cabinet.ts`)                            | АРМ (`application.ts`)                                        |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| Статус            | `applicationStatusSchema`, 7 значений             | тот же словарь                                                |
| Решение           | `Decision` с факторами и советом клиенту          | `creditDecisionSchema`: рекомендация, правила, причина отказа |
| Этап и ход        | нет                                               | `stage`, `waitingOn`, `blocker`, `hold`, `urgent`             |
| Проверки          | `checksPassed` от 0 до 3                          | список `checks` по источникам                                 |
| Диалог с клиентом | `requests`, `deal`                                | `requestedInfo`, `comments`, `handoff`                        |
| Аудит             | `ApplicationEvent` с `actor` client, bank, system | `ApplicationEvent` со сменой статуса и `kind`                 |
| Автономность      | нет                                               | `autonomy` из `GET /v1/applications/{id}/context`             |

`Deal`, `ClientRequest` и `AttachedDocument` описаны в контракте, но api их не хранит: таблиц для них нет, кабинет получает пустые `documents`, `requests`, `events` и `deal: null`.
