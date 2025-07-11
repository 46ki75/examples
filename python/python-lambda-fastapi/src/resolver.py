import strawberry
from strawberry.fastapi import GraphQLRouter


@strawberry.federation.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello, GraphQL!"


schema = strawberry.federation.Schema(Query)
