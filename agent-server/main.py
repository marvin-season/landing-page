"""
Example for serving you Agno agent as an AG-UI server
"""

import dotenv
from agno.os import AgentOS
from agno.os.interfaces.agui import AGUI
from fastapi.middleware.cors import CORSMiddleware

from src.agent import agent

dotenv.load_dotenv()

# Build AgentOS and extract the app for serving
agent_os = AgentOS(agents=[agent], interfaces=[AGUI(agent=agent)])
app = agent_os.get_app()

# 配置 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js 开发服务器
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

if __name__ == "__main__":
    agent_os.serve(app="main:app", port=7777, reload=True)
