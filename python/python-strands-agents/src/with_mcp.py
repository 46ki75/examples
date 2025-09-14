from mcp import stdio_client, StdioServerParameters
from strands import Agent
from strands.tools.mcp import MCPClient
from strands.models import BedrockModel

stdio_mcp_client = MCPClient(lambda: stdio_client(
    StdioServerParameters(
        command="uvx",
        args=["strands-agents-mcp-server"]
    )
))

bedrock_model = BedrockModel(model_id="apac.amazon.nova-pro-v1:0")

# Create an agent with MCP tools
with stdio_mcp_client:
    # Get the tools from the MCP server
    tools = stdio_mcp_client.list_tools_sync()

    # Create an agent with these tools
    agent = Agent(tools=tools, model=bedrock_model)
    agent("What is Strands Agents? Can you show me how to create an AI agent using MCP servers with it?")
