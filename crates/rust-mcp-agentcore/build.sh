#!/bin/bash

cargo build --target aarch64-unknown-linux-gnu
cp ../../target/aarch64-unknown-linux-gnu/release/rust-mcp-agentcore .
docker buildx build . --platform linux/arm64 -t rust-mcp-agentcore
