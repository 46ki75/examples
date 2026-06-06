from fastapi import APIRouter

my_router = APIRouter()


@my_router.get("/")
def root():
    return {"message": "Hello, world!", "path": ["/", "/hello", "/graphql"]}


@my_router.get("/hello")
def greet():
    return {"message": "Hello from FastAPI + Lambda"}
