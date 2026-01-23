"""
AG-UI Protocol Server - ProseMirror JSON Generator
"""

from agno.agent import Agent
from agno.models.ollama import Ollama
from agno.os import AgentOS
from agno.os.interfaces.agui import AGUI
from scheam import ProseMirrorDoc
from prompt import instructions


# ============================================================================
# Agent Configuration
# ============================================================================

agent = Agent(
    name="ProseMirror Agent",
    model=Ollama(id="qwen2.5:3b"),
    description="Generates ProseMirror-compatible JSON documents",
    instructions=instructions,
    stream=True,
    use_json_mode=True,
    markdown=False,  # 禁用 markdown 格式化
)


# ============================================================================
# AgentOS with AG-UI Interface
# ============================================================================

agent_os = AgentOS(
    agents=[agent],
    interfaces=[AGUI(agent=agent)],
)

app = agent_os.get_app()


if __name__ == "__main__":
    agent_os.serve(app="main:app", port=7777, log_level="info", reload=True)