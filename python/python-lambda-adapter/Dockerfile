# Build from the workspace root (python/):
#   docker build -f python-lambda-adapter/Dockerfile -t python-lambda-adapter .
FROM ghcr.io/astral-sh/uv:python3.13-alpine
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV AWS_LWA_PORT=8000
WORKDIR /var/task
COPY . .
RUN uv sync --frozen --no-dev --package python-lambda-adapter
ENV UV_CACHE_DIR=/tmp/uv

CMD ["uv", "run", "--frozen", "--no-dev", "--package", "python-lambda-adapter", "uvicorn", "python_lambda_adapter.main:app", "--host", "0.0.0.0", "--port", "8000"]
