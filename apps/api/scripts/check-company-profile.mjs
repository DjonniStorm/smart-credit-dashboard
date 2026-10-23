// Smoke только для сложных интеграционных веток профиля: согласие БКИ и manual_check.
// Для обычных правок достаточно lint и typecheck; этот сценарий запускать не нужно.

const apiUrl = process.env.API_URL ?? "http://localhost:4000";
const testInn = "9901000017";
const scenarioInn = "9903000033";

async function request(path, init) {
  const response = await fetch(`${apiUrl}${path}`, init);
  const body = await response.json().catch(() => null);
  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const unauthenticated = await request(`/v1/companies/${testInn}/profile`);
assert(unauthenticated.response.status === 401, "Профиль требует сессию");

const signIn = await request("/v1/auth/demo-sign-in", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ accountId: "bakery" }),
});
assert(signIn.response.status === 200, "Демо-вход должен вернуть 200");
const cookie = signIn.response.headers.get("set-cookie");
assert(cookie, "Демо-вход должен установить cookie");

function withSession(init = {}) {
  return { ...init, headers: { ...(init.headers ?? {}), cookie } };
}

function sourceOf(profile, source) {
  return profile.sources.find((item) => item.source === source);
}

const beforeConsent = await request(`/v1/companies/${testInn}/profile`, withSession());
assert(
  beforeConsent.response.status === 200,
  "Профиль до согласия должен вернуть 200",
);
assert(
  beforeConsent.body.bkiConsent.status === "required",
  "До согласия БКИ должно быть закрыто",
);
assert(
  sourceOf(beforeConsent.body, "bki").facts.length === 0,
  "До согласия факты БКИ не должны возвращаться",
);

const granted = await request(`/v1/companies/${testInn}/consents/bki`, withSession({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ granted: true }),
}));
assert(granted.response.status === 200, "Выдача согласия должна вернуть 200");
assert(
  granted.body.bkiConsent.status === "granted",
  "Согласие должно сохраниться",
);
assert(
  sourceOf(granted.body, "bki").facts.length > 0,
  "После согласия должны появиться факты БКИ",
);

const repeated = await request(`/v1/companies/${testInn}/consents/bki`, withSession({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ granted: true }),
}));
assert(
  repeated.response.status === 200,
  "Повторное согласие должно быть идемпотентным",
);
assert(
  repeated.body.bkiConsent.status === "granted",
  "Повторное согласие должно остаться granted",
);

const invalidInn = await request("/v1/companies/not-an-inn/profile", withSession());
assert(invalidInn.response.status === 400, "Ошибочный ИНН должен вернуть 400");

const employeeSignIn = await request("/v1/auth/employee-sign-in", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ employeeId: "an-1" }),
});
assert(employeeSignIn.response.status === 200, "Вход сотрудника должен вернуть 200");
const employeeCookie = employeeSignIn.response.headers.get("set-cookie");
assert(employeeCookie, "Вход сотрудника должен установить cookie");
const unavailable = await request(`/v1/companies/${scenarioInn}/profile`, {
  headers: { cookie: employeeCookie },
});
assert(
  unavailable.response.status === 200,
  "Недоступный источник не должен давать отказ",
);
assert(
  sourceOf(unavailable.body, "bank_turnover").state === "manual_check",
  "Недоступный источник должен перейти в manual_check",
);
assert(
  sourceOf(unavailable.body, "fns").state === "discrepancy",
  "Расхождение должно быть привязано к реальным источникам",
);

console.log(`company profile checks passed for ${testInn}`);
