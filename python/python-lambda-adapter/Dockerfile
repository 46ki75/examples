FROM ghcr.io/astral-sh/uv:python3.12-alpine
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV AWS_LWA_PORT=8000
WORKDIR /var/task
ENV PYTHONPATH=/var/task
COPY ./src ./src
COPY ./pyproject.toml ./uv.lock ./
RUN uv sync
ENV UV_CACHE_DIR=/tmp/uv

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
