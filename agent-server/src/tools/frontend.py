from agno.tools import tool


@tool(external_execution=True)
def set_theme_color(theme_color: str):
    """
    Change the theme color of the chat.

    Args:
        background: str: The background color to change to.
    """


@tool(external_execution=True)
def add_proverb(proverb: str):
    """
    Add a proverb to the chat.

    Args:
        proverb: str: The proverb to add to the chat.
    """


@tool(external_execution=True)
def user_confirm(action: str, description: str):
    """
    Request user confirmation before performing an action.
    This tool requires explicit user authorization before execution.

    Args:
        action: str: The action that requires confirmation (e.g., "delete_file", "send_email", "purchase_item").
        description: str: A detailed description of what will happen if the user confirms.
    
    Returns:
        bool: True if the user confirms, False if the user rejects.
    """
