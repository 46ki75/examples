# The Web Search target uses the built-in "web-search" connector. Neither the
# native aws_bedrockagentcore_gateway_target resource nor the bundled aws CLI
# model the `connector` target type yet (only lambda / api_gateway / mcp_server /
# open_api_schema / smithy_model), so we create it with a small boto3 helper run
# through `uv run` (the workspace's pinned boto3 is new enough to know the
# `connector` shape). Everything else in this stack is native Terraform.
#
# To add a domain denylist, append `--exclude-domain blocked-1.com` (repeatable)
# to the create command below; see web_search_target.py.

resource "terraform_data" "web_search_target" {
  triggers_replace = [aws_bedrockagentcore_gateway.this.gateway_id]

  # Carried in `input` so the destroy-time provisioner can reach them via `self`
  # (other resources, vars, and locals are not available during destroy).
  input = {
    region     = local.region
    gateway_id = aws_bedrockagentcore_gateway.this.gateway_id
    name       = "web-search-tool"
    script     = abspath("${path.module}/web_search_target.py")
  }

  provisioner "local-exec" {
    command = "env -u VIRTUAL_ENV uv run python ${self.input.script} create --region ${self.input.region} --gateway-id ${self.input.gateway_id} --name ${self.input.name}"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "env -u VIRTUAL_ENV uv run python ${self.input.script} delete --region ${self.input.region} --gateway-id ${self.input.gateway_id} --name ${self.input.name}"
  }
}
