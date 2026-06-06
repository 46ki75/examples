from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from strawberry.fastapi import GraphQLRouter

from python_lambda_fastapi.controller import my_router
from python_lambda_fastapi.resolver import schema

app = FastAPI()


graphql_router = GraphQLRouter(schema)

app.include_router(my_router)
app.include_router(graphql_router, prefix="/graphql")

app.add_middleware(GZipMiddleware, minimum_size=1000)
