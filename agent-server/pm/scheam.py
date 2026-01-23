from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ProseMirrorNode(BaseModel):
    # 给 type 默认值，或者明确它是必须的
    type: str = Field(..., description="节点类型，如 'text', 'paragraph'")
    text: Optional[str] = None
    # 允许 content 为空列表，防止模型不输出该字段
    content: Optional[List['ProseMirrorNode']] = Field(default_factory=list)
    attrs: Optional[Dict[str, Any]] = None

ProseMirrorNode.model_rebuild()

class ProseMirrorDoc(BaseModel):
    type: str = "paragraph"
    # 核心：确保 content 即使为空也是个列表
    content: List[ProseMirrorNode] = Field(default_factory=list)