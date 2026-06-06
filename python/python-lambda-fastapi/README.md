# python-lambda-fastapi

## Running the Development Server

```sh
# Using a custom script
uv run python -m python_lambda_fastapi.local

# Using a direct command
uv run uvicorn python_lambda_fastapi.router:app
```

## Bundle for AWS Lambda Function

```sh
bash scripts/build.sh
```

The Lambda handler is `python_lambda_fastapi.lambda.handler`.
