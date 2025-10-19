FROM ghcr.io/berriai/litellm:main-latest
USER root
COPY litellm-config.yaml /app/litellm-config.yaml
RUN uv tool install strands-agents-mcp-server && \
    uv tool install duckduckgo-mcp-server
RUN apk update && apk add nodejs npm
RUN npm install -g repomix
CMD ["--config", "/app/litellm-config.yaml", "--port", "8000"]
