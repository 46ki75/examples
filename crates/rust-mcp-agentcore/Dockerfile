FROM docker.io/library/rust:1.90.0 as build
WORKDIR /dist
COPY . .
RUN apt-get update && apt-get install -y gcc-aarch64-linux-gnu
RUN rustup target add aarch64-unknown-linux-gnu
RUN cargo build --release --target aarch64-unknown-linux-gnu

FROM --platform=arm64 scratch
COPY --from=build --chown=user:group /dist/target/release/rust-mcp-agentcore /rust-mcp-agentcore
CMD [ "/rust-mcp-agentcore" ]
