# strands-agents and strands-tools ship without complete type information,
# so strict mode reports their decorators and tools as unknown.
# pyright: basic
from strands import Agent, tool
from strands_tools import calculator, current_time
from strands.models import BedrockModel


@tool
def letter_counter(word: str, letter: str) -> int:
    """
    Count occurrences of a specific letter in a word.

    Args:
        word (str): The input word to search in
        letter (str): The specific letter to count

    Returns:
        int: The number of occurrences of the letter in the word
    """
    if len(letter) != 1:
        raise ValueError("The 'letter' parameter must be a single character")

    return word.lower().count(letter.lower())


bedrock_model = BedrockModel(model_id="apac.amazon.nova-pro-v1:0")


# Create an agent with tools from the community-driven strands-tools package
# as well as our custom letter_counter tool
agent = Agent(tools=[calculator, current_time, letter_counter], model=bedrock_model)

# Ask the agent a question that uses the available tools
message = """
I have 4 requests:

1. What is the time right now?
2. Calculate 3111696 / 74088
3. Tell me how many letter R's are in the word "strawberry" 🍓
"""
agent(message)
