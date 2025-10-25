FROM mcr.microsoft.com/devcontainers/base:debian

USER vscode

RUN echo 'eval "$(starship init bash)"' >> ~/.bashrc

ARG TERRAFORM_CACHE_DIR="/home/vscode/.terraform.d/plugin-cache"

RUN mkdir -p ${TERRAFORM_CACHE_DIR} && echo '"plugin_cache_dir = ${TERRAFORM_CACHE_DIR}"' >> ~/.terraformrc
