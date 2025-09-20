# Ansible + Packer + Molecule

## Prerequisites

Install the following:

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- Amazon Systems Manager [Session Manager Plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
- [astral-sh/uv](https://docs.astral.sh/uv/getting-started/installation/)

**Manually** create the following resources:

- Amazon S3 Buckets used for file transfers by SSM.

## Preparation

### Install Python Modules

```bash
uv sync
```

### Install Ansible Collections

```bash
uv run ansible-galaxy collection install -r requirements.yml
```

## Playbook Testing (Molecule)

Molecule executes a series of plays in `molecule/{scenario_name}/`. The lifecycle is configurable if needed (see the [documentation](https://ansible.readthedocs.io/projects/molecule/philosophy/#how-molecule-addresses-testing-suite-requirements)).

Summary:

1. **Destroy** | Ensure no CloudFormation stack exists
2. **Create** | Deploy the CloudFormation stack
3. **Converge** | Test Playbooks
4. **Converge** | Test Playbooks (check idempotency)
5. **Destroy** | Delete the CloudFormation stack

```bash
uv run molecule test
```

## Create AMI with Packer

```bash
./build-ami.sh
```
