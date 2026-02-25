from agno.tools import tool


@tool
def get_weather(location: str):
    """
    Get the weather for the current location.

    Args:
        location (str): The location to get the weather for.

    Returns:
        str: The weather for the current location.
    """
    return f"The weather in {location} is: 70 degrees and Sunny."


@tool(requires_confirmation=True)
def delete_file(file_path: str):
    """
    Delete a file from the system. 
    
    ⚠️ WARNING: This is a destructive operation that requires user confirmation!

    Args:
        file_path (str): The path of the file to delete.
    
    Returns:
        str: Confirmation message about the deletion operation.
    """
    print(f"Deleting file: {file_path}")
    return f"File '{file_path}' has been deleted successfully."


@tool(requires_confirmation=True)
def send_email(recipient: str, body: str):
    """
    Send an email to a recipient.
    
    Args:
        recipient (str): The email address of the recipient.
        body (str): The body content of the email.
    
    Returns:
        str: message content about the email.
    """
    print(f"Sending email to {recipient}")
    print(f"Body: {body}")
    return f"Important email sent successfully to {recipient}"
