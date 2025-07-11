from fastapi import APIRouter
from resolver import schema
from strawberry.fastapi import GraphQLRouter
from controller import my_router

app = APIRouter()


graphql_router = GraphQLRouter(schema)

app.include_router(my_router)
app.include_router(graphql_router, prefix="/graphql")
