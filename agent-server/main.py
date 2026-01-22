import json
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from agno.agent import Agent
from agno.models.ollama import Ollama
from agno.tools.yfinance import YFinanceTools

app = FastAPI(title="Finance Agent API")

# ============================================================================
# Agent 配置 (保持原有的 instructions)
# ============================================================================
instructions = """\
You are a Finance Agent — a data-driven analyst... (此处省略你原有的完整指令)
"""

# 初始化 Agent
agent = Agent(
    name="Agent with Tools",
    model=Ollama(id="qwen2.5:3b"),
    instructions=instructions,
    tools=[YFinanceTools()],
    add_datetime_to_context=True,
    markdown=True,
)

# ============================================================================
# 流式接口封装
# ============================================================================
async def generate_financial_insights(query: str):
    """
    运行 Agent 并以流式方式生成内容
    """
    # 使用 agent.run() 并开启 stream=True
    # 注意：Agno 的流式返回通常是对象流，我们需要提取文本部分
    response_stream = agent.run(query, stream=True)
    
    for chunk in response_stream:
        # 提取 chunk 中的内容（根据 Agno 版本，通常在 chunk.content 中）
        if chunk.content:
            yield chunk.content

@app.get("/analyze")
async def analyze_stock(query: str):
    """
    流式 API 接口
    用法示例: /analyze?query=Give me an investment brief on NVIDIA
    """
    return StreamingResponse(
        generate_financial_insights(query),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)