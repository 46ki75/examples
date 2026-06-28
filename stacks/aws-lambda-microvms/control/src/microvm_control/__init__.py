"""Operator CLI for the AWS Lambda MicroVMs code-exec sandbox example.

Drives the imperative MicroVM lifecycle that does not map cleanly to declarative
IaC: package + build the image, run a MicroVM, mint a JWE auth token, call the
sandbox over its HTTPS endpoint, and suspend/resume/terminate. See
``microvm_control.cli`` for the command surface, or run ``microvm-control --help``.
"""
