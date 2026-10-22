// Smoke только для сложных интеграционных веток профиля: согласие БКИ и manual_check.
// Для обычных правок достаточно lint и typecheck; этот сценарий запускать не нужно.

const apiUrl = process.env.API_URL ?? "http://localhost:4000";
const testInn = String(
  Math.floor(1_000_000_000 + Math.random() * 8_999_999_999),
);
const unavailableInn = "0000000000";

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

function sourceOf(profile, source) {
  return profile.sources.find((item) => item.source === source);
}

const beforeConsent = await request(`/v1/companies/${testInn}/profile`);
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

const granted = await request(`/v1/companies/${testInn}/consents/bki`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ granted: true }),
});
assert(granted.response.status === 200, "Выдача согласия должна вернуть 200");
assert(
  granted.body.bkiConsent.status === "granted",
  "Согласие должно сохраниться",
);
assert(
  sourceOf(granted.body, "bki").facts.length > 0,
  "После согласия должны появиться факты БКИ",
);

const repeated = await request(`/v1/companies/${testInn}/consents/bki`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ granted: true }),
});
assert(
  repeated.response.status === 200,
  "Повторное согласие должно быть идемпотентным",
);
assert(
  repeated.body.bkiConsent.status === "granted",
  "Повторное согласие должно остаться granted",
);

const invalidInn = await request("/v1/companies/not-an-inn/profile");
assert(invalidInn.response.status === 400, "Ошибочный ИНН должен вернуть 400");

const unavailable = await request(
  `/v1/companies/${unavailableInn}/consents/bki`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ granted: true }),
  },
);
assert(
  unavailable.response.status === 200,
  "Недоступный источник не должен давать отказ",
);
assert(
  sourceOf(unavailable.body, "bki").state === "manual_check",
  "Недоступный БКИ должен перейти в manual_check",
);

console.log(`company profile checks passed for ${testInn}`);
