"""
AG-UI Protocol Server - ProseMirror JSON Generator
"""

from typing import List, Optional, Union, Literal
from pydantic import BaseModel, Field

from agno.agent import Agent
from agno.models.ollama import Ollama
from agno.os import AgentOS
from agno.os.interfaces.agui import AGUI

from prompt import PM_INSTRUCTIONS, BASE_INSTRUCTIONS


# ============================================================================
# ProseMirror Schema Models
# ============================================================================

class MarkAttrs(BaseModel):
    color: str = "red"

class MyMark(BaseModel):
    type: Literal["myMark"] = "myMark"
    attrs: MarkAttrs = Field(default_factory=MarkAttrs)

class TextNode(BaseModel):
    type: Literal["text"] = "text"
    text: str
    marks: Optional[List[MyMark]] = None

class VariableAttrs(BaseModel):
    label: str = ""

class VariableNode(BaseModel):
    type: Literal["variable"] = "variable"
    attrs: VariableAttrs = Field(default_factory=VariableAttrs)

class UserConfirmAttrs(BaseModel):
    id: str = ""
    status: str = "pending"
    userName: str = "Guest"

class UserConfirmNode(BaseModel):
    type: Literal["userConfirm"] = "userConfirm"
    attrs: UserConfirmAttrs = Field(default_factory=UserConfirmAttrs)

class MyButtonAttrs(BaseModel):
    color: str = "red"

class MyButtonNode(BaseModel):
    type: Literal["myButton"] = "myButton"
    attrs: MyButtonAttrs = Field(default_factory=MyButtonAttrs)
    content: Optional[List["PMNode"]] = None

class ParagraphNode(BaseModel):
    type: Literal["paragraph"] = "paragraph"
    content: Optional[List["PMNode"]] = None

# 联合类型
PMNode = Union[TextNode, ParagraphNode, UserConfirmNode, VariableNode, MyButtonNode]

class ProseMirrorDoc(BaseModel):
    type: Literal["doc"] = "doc"
    content: List[PMNode]


# ============================================================================
# Agent Configuration
# ============================================================================

agent = Agent(
    name="ProseMirror Agent",
    model=Ollama(id="qwen2.5:3b"),
    description="Generates ProseMirror-compatible JSON documents",
    instructions=BASE_INSTRUCTIONS,
    additional_context=PM_INSTRUCTIONS,  # 添加详细的 PM 指令作为上下文
    output_schema=ProseMirrorDoc,
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