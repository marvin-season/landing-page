#!/bin/bash

# Navigate to the agent directory
cd "$(dirname "$0")/../agent-server" || exit 1

# Run the agent using uv
uv run python main.py
