# python-lambda-adapter

This is an example of using [awslabs/aws-lambda-web-adapter](https://github.com/awslabs/aws-lambda-web-adapter).

A Python ASGI application is started with uvicorn, and aws-lambda-web-adapter acts as a reverse proxy, forwarding requests to uvicorn.

## Running the Development Server

```sh
uv run uvicorn python_lambda_adapter.main:app --reload
```

## Building the Container Image

The image is built from the uv workspace root (`python/`) so the shared
`uv.lock` is available to `uv sync --frozen`:

```sh
cd ..
docker build -f python-lambda-adapter/Dockerfile -t python-lambda-adapter .
```
