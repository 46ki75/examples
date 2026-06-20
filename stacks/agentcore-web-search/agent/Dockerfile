# Amazon Bedrock AgentCore Runtime requires linux/arm64 images.
FROM --platform=linux/arm64 python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_LINK_MODE=copy

# requirements.txt is exported from the workspace lock by `just push`, so the
# image is reproducible without shipping the whole workspace into the build.
COPY requirements.txt ./
RUN uv pip install --system --no-cache -r requirements.txt

# Install the agent package itself; its dependencies are already satisfied above.
COPY README.md pyproject.toml ./
COPY src ./src
RUN uv pip install --system --no-cache --no-deps .

EXPOSE 8080

# BedrockAgentCoreApp serves /invocations and /ping on 0.0.0.0:8080.
CMD ["python", "-m", "agentcore_web_search.main"]
