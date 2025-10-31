FROM docker.io/library/rust:1.90.0 AS build
WORKDIR /app
RUN apt-get update -y && \
    apt-get install -y npm && \
    npm install -g @ziglang/cli && \
    curl -fsSL https://cargo-lambda.info/install.sh | sh
COPY . .
RUN cargo lambda build --release

FROM docker.io/library/debian:trixie-slim
WORKDIR /app
RUN apt-get update -y && \
    apt-get install -y npm && \
    npx -y @puppeteer/browsers install chrome-headless-shell@stable --install-deps --path /opt && \
    ln -s $(ls /opt/chrome-headless-shell/linux-*/chrome-headless-shell-linux64/chrome-headless-shell) /bin/chrome-headless-shell && \
    apt-get remove -y npm && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/lambda/rust-lambda-chrome/bootstrap /app/bootstrap
RUN chmod +x /app/bootstrap

ENTRYPOINT ["/app/bootstrap"]
