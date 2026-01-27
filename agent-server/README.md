## Prerequisites

ollama server running and qwen2.5:3b model downloaded or Your API KEY in .env
```bash
ollama run qwen2.5:3b
```
[uv](https://docs.astral.sh/uv/) is required to install dependencies and run the server.
```sh
curl -LsSf https://astral.sh/uv/install.sh | sh
```
## Quick Start

```bash
cd agent-server \
uv venv --python 3.12 \
source .venv/bin/activate \
uv sync
```

可选：在 VSCode 中，`Ctrl+P` 设置解释器为 `.venv/bin/python`

## 启动

### 启动 AG-UI 协议服务器（推荐）

AG-UI 协议服务器实现了标准的 AG-UI 协议接口，可以在 agent-ui template 中直接使用：

```bash
uv run main.py
```

服务器将在 `http://0.0.0.0:7777` 启动，提供符合 AG-UI 协议标准的 API 端点。

## AG-UI 协议服务器说明

`agui_server.py` 使用以下配置：
- **框架**: agno
- **模型**: ollama qwen2.5:3b
- **协议**: AG-UI (Agent User Interaction Protocol)
- **端口**: 7777

该服务器可以直接与 agent-ui template 集成使用。

## FAQ
- 502 

```bash
export http_proxy=
export https_proxy=
export all_proxy=
export HTTP_PROXY=
export HTTPS_PROXY=
export ALL_PROXY=
export no_proxy=127.0.0.1,localhost
```