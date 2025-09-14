from mcp import stdio_client, StdioServerParameters
from strands import Agent
from strands.tools.mcp import MCPClient
from strands.models import BedrockModel
from bedrock_agentcore.runtime import BedrockAgentCoreApp

stdio_mcp_client = MCPClient(lambda: stdio_client(
    StdioServerParameters(
        command="uvx",
        args=["strands-agents-mcp-server"]
    )
))

bedrock_model = BedrockModel(model_id="apac.amazon.nova-pro-v1:0")


app = BedrockAgentCoreApp()


@app.entrypoint
async def agent_invocation(payload):
    """Handler for agent invocation"""
    user_message = payload.get(
        "prompt", "No prompt found in input, please guide customer to create a json payload with prompt key"
    )
    # Create an agent with MCP tools
    with stdio_mcp_client:
        # Get the tools from the MCP server
        tools = stdio_mcp_client.list_tools_sync()
        agent = Agent(tools=tools, model=bedrock_model)
        stream = agent.stream_async(user_message)

        try:
            async for event in stream:
                if "data" in event:
                    # Only stream text chunks to the client
                    yield event["data"]

        except Exception as e:
            yield f"Error: {str(e)}"


if __name__ == "__main__":
    app.run()

# uv tool install bedrock-agentcore-starter-toolkit
# uv export --format requirements-txt > requirements.txt
# agentcore configure --entrypoint src/deploy_to_agentcore.py --region us-east-1
# agentcore launch --local # OPTIONAL
# agentcore launch
