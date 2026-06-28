# This Dockerfile is built by AWS Lambda during `create-microvm-image`: the
# control CLI zips it together with `src/` and uploads the zip to S3, then Lambda
# runs this build, starts the app, calls the /ready hook, and snapshots the
# initialized memory + disk. Every `run-microvm` resumes from that snapshot.
#
# MicroVMs run on ARM64 (cpuConfigurations only documents ARM_64).
FROM --platform=linux/arm64 public.ecr.aws/docker/library/python:3.13-slim

WORKDIR /app

# Deps are pinned here rather than installed from pyproject.toml so the image
# build stays a plain `pip install` with no build backend in the build context.
# Keep these in sync with image/pyproject.toml.
RUN pip install --no-cache-dir "fastapi>=0.116.0" "uvicorn>=0.35.0"

COPY src/microvm_sandbox ./microvm_sandbox

# 8080 = data-plane traffic port (default MicroVM routing target).
# 9000 = lifecycle-hook control port (must match hooks.port at image creation).
EXPOSE 8080 9000

CMD ["python", "-m", "microvm_sandbox.main"]
