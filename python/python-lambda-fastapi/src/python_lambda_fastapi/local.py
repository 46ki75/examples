import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "python_lambda_fastapi.router:app", host="127.0.0.1", port=8000, reload=True
    )
