export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ?? "postgres://alfa:alfa@localhost:5432/alfa",
  scoringUrl: process.env.SCORING_URL ?? "http://localhost:8000",
  mocksUrl: process.env.MOCKS_URL ?? "http://localhost:4100",
};
