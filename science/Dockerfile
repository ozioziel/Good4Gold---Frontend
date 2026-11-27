# Laboratorio virtual: carga en PostGIS los resultados ya calculados (science/datos/derivados) o rehace la corrida.
#   docker compose --profile laboratorio run --rm ciencia cargar
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.13 /uv /usr/local/bin/uv
WORKDIR /ciencia
ENV UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv PATH="/opt/venv/bin:$PATH"
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
ENTRYPOINT ["python", "-m", "g2"]
CMD ["cargar"]
