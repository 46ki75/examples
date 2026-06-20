# The Web Search target uses the built-in "web-search" connector. The native
# aws_bedrockagentcore_gateway_target resource does not yet model the `connector`
# target type (only lambda / api_gateway / mcp_server / open_api_schema /
# smithy_model), so we create it through the AWS CLI. Everything else in this
# stack is native Terraform.
#
# To add a domain denylist, set:
#   parameterValues = { domainFilter = { exclude = ["blocked-1.com", ...] } }

resource "terraform_data" "web_search_target" {
  triggers_replace = [aws_bedrockagentcore_gateway.this.gateway_id]

  provisioner "local-exec" {
    command = <<-EOT
      aws bedrock-agentcore-control create-gateway-target \
        --region ${local.region} \
        --gateway-identifier ${aws_bedrockagentcore_gateway.this.gateway_id} \
        --name web-search-tool \
        --target-configuration '${jsonencode({
    mcp = {
      connector = {
        source         = { connectorId = "web-search" }
        configurations = [{ name = "WebSearch", parameterValues = {} }]
      }
    }
})}' \
        --credential-provider-configurations '[{"credentialProviderType":"GATEWAY_IAM_ROLE"}]'
    EOT
}

# gateway_id is captured in triggers_replace so it is reachable as `self`
# during destroy (other resources/locals are not available there).
provisioner "local-exec" {
  when    = destroy
  command = <<-EOT
      TARGET_ID=$(aws bedrock-agentcore-control list-gateway-targets \
        --region us-east-1 \
        --gateway-identifier ${self.triggers_replace[0]} \
        --query "items[?name=='web-search-tool'].targetId | [0]" --output text)
      if [ -n "$TARGET_ID" ] && [ "$TARGET_ID" != "None" ]; then
        aws bedrock-agentcore-control delete-gateway-target \
          --region us-east-1 \
          --gateway-identifier ${self.triggers_replace[0]} \
          --target-id "$TARGET_ID"
      fi
    EOT
}
}
