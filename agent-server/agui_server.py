"""
AG-UI Protocol Server
=====================
使用 agno 框架和 ollama qwen2.5:3b 模型实现标准的 AG-UI 协议接口
可以在 agent-ui template 中直接使用

AG-UI (Agent User Interaction Protocol) 是一个标准化的协议，
用于前端应用和 AI 代理之间的实时双向通信。

使用方法:
1. 确保已安装依赖: uv sync
2. 确保 ollama 服务运行，并且已下载 qwen2.5:3b 模型
3. 运行: uv run agui_server.py
4. 服务器将在 http://0.0.0.0:8000 启动

参考: https://docs.agno.com/agent-os/interfaces/ag-ui/introduction
"""

from fastapi.responses import StreamingResponse
from agno.agent import Agent
from agno.models.ollama import Ollama
from agno.os import AgentOS
from agno.os.interfaces.agui import AGUI

# ============================================================================
# Agent 配置
# ============================================================================
instructions = """\
You are a helpful AI assistant powered by qwen2.5:3b model.
You provide clear, concise, and accurate responses to user queries.
"""

# 创建 Agent，使用 ollama qwen2.5:3b 模型
agent = Agent(
    name="Qwen Agent",
    model=Ollama(id="qwen2.5:3b"),
    instructions=instructions,
    add_datetime_to_context=True,
    markdown=True,
)

# ============================================================================
# 创建 AgentOS 并配置 AG-UI 接口
# ============================================================================
# AGUI 接口将 Agent 包装成符合 AG-UI 协议标准的 FastAPI router
agent_os = AgentOS(
    agents=[agent],
    interfaces=[AGUI(agent=agent)],
)

# 获取 FastAPI 应用
# AgentOS 会自动创建符合 AG-UI 协议标准的端点
app = agent_os.get_app()

# ============================================================================
# 添加自定义聊天端点
# ============================================================================
@app.get("/api/chat")
async def chat_endpoint():
    """
    简单的聊天端点，支持流式响应
    接受格式: {"message": "用户消息", "stream": true}
    """
    # message = request.get("message", "")
    # stream = request.get("stream", True)
    message = "Hello"
    print("user message: ", message)
    
    # 流式响应
    async def generate_response():
        response_stream = agent.run(message, stream=True)
        for chunk in response_stream:
            if hasattr(chunk, 'content') and chunk.content:
                yield f"data: {chunk.content}\n\n"
            elif isinstance(chunk, str):
                yield f"data: {chunk}\n\n"
    
    return StreamingResponse(
        generate_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

# ============================================================================
# 启动服务器
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    
    # 使用导入字符串以支持 reload 功能
    uvicorn.run(
        "agui_server:app",
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=True
    )
