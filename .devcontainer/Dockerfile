FROM mcr.microsoft.com/devcontainers/base:debian

# mise's binary installs still need native build libraries and .NET's ICU/Kerberos runtime.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential pkg-config libssl-dev libicu-dev libgssapi-krb5-2 unzip zip && \
    rm -rf /var/lib/apt/lists/*

USER vscode

ARG MISE_VERSION=v2026.9.9
RUN curl -fsSL https://mise.run | MISE_VERSION=${MISE_VERSION} sh

ENV PATH="/home/vscode/.local/bin:/home/vscode/.local/share/mise/shims:${PATH}"

RUN echo 'eval "$(mise activate bash)"' >> ~/.bashrc && \
    echo 'eval "$(mise activate zsh)"' >> ~/.zshrc

RUN echo 'eval "$(starship init bash)"' >> ~/.bashrc

ARG TERRAFORM_CACHE_DIR="/home/vscode/.terraform.d/plugin-cache"

RUN mkdir -p ${TERRAFORM_CACHE_DIR} && \
    echo 'plugin_cache_dir = "'${TERRAFORM_CACHE_DIR}'"' >> ~/.terraformrc
