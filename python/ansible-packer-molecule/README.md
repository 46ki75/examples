# Ansible + Packer + Molecule

## Prerequisites

Installation of:

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Amazon Systems Manager [Session Manager Plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
- [astral-sh/uv](https://docs.astral.sh/uv/getting-started/installation/)

Create following resources **manually**:

- Amazon S3 Buckets used for file transfers by SSM.

## Preparation

### Install Python Modules

```bash
uv sync
```

### Install Ansible Collections

```bash
ansible-galaxy install -r requirements.yaml
```
