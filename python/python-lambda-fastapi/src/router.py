from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware
from resolver import schema
from strawberry.fastapi import GraphQLRouter
from controller import my_router

app = FastAPI()


graphql_router = GraphQLRouter(schema)

app.include_router(my_router)
app.include_router(graphql_router, prefix="/graphql")

app.add_middleware(GZipMiddleware, minimum_size=1000)
