# Сборка из корня репозитория: docker build -f apps/scoring/Dockerfile .
FROM python:3.12-slim AS build
# uv из PyPI, а не из ghcr.io: реестр ghcr доступен не из всех сетей.
RUN pip install --no-cache-dir uv==0.12.21

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

COPY apps/scoring/pyproject.toml apps/scoring/uv.lock apps/scoring/.python-version ./
RUN uv sync --locked --no-dev --no-install-project

FROM python:3.12-slim AS runner
WORKDIR /app
COPY --from=build /app/.venv ./.venv
COPY apps/scoring/app ./app
COPY apps/scoring/training ./training
COPY apps/scoring/artifacts ./artifacts

ENV PATH="/app/.venv/bin:$PATH"
RUN useradd --uid 1001 app
USER app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
