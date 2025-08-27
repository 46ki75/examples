FROM python:3.11-slim
WORKDIR /app
RUN pip install mcpo uv
COPY config.json /app/config.json
CMD ["mcpo", "--config", "/app/config.json"]
