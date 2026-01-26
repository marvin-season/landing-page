from agno.agent import Agent
from agno.models.ollama import Ollama
from agno.os import AgentOS
from agno.tools import tool



@tool(requires_confirmation=True)
def delete_records(table_name: str, count: int) -> str:
    """Delete records from a database table.

    Args:
        table_name: Name of the table
        count: Number of records to delete

    Returns:
        str: Confirmation message
    """
    return f"Deleted {count} records from {table_name}"


@tool(requires_confirmation=True)
def send_notification(recipient: str, message: str) -> str:
    """Send a notification to a user.

    Args:
        recipient: Email or username of the recipient
        message: Notification message

    Returns:
        str: Confirmation message
    """
    return f"Sent notification to {recipient}: {message}"


# Create agent with HITL tools
agent = Agent(
    name="Data Manager",
    id="data_manager",
    model=Ollama(id="qwen2.5:7b"),
    tools=[delete_records, send_notification],
    instructions=["You help users manage data operations"],
    markdown=True,
)

# Create AgentOS
agent_os = AgentOS(
    id="agentos-hitl",
    agents=[agent],
)

app = agent_os.get_app()

if __name__ == "__main__":
    agent_os.serve(app="hitl_confirmation:app", port=7777)