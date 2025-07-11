# python-lambda-fastapi

## Running the Development Server

```sh
# Using a custom script
uv run src/local.py

# Using a direct command
PYTHONPATH=./src uv run uvicorn router:app
```

## Bundle for AWS Lambda Function

```sh
uv run scripts/build.py
```
