# python-lambda-adapter

This is an example of using [awslabs/aws-lambda-web-adapter](https://github.com/awslabs/aws-lambda-web-adapter).

A Python ASGI application is started with uvicorn, and aws-lambda-web-adapter acts as a reverse proxy, forwarding requests to uvicorn.
