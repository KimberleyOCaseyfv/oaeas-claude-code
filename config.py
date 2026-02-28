"""
OAEAS + Claude Code 配置文件
"""

import os

# API配置
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# 项目配置
PROJECT_NAME = "OAEAS-ClaudeCode"
VERSION = "1.0.0"
WORKING_DIR = os.getenv("OAEAS_WORKING_DIR", ".")

# 多Agent角色配置
PERSONAS = {
    "architect": {
        "name": "Architect",
        "model": "claude-3-opus-20240229",
        "temperature": 0.2,
        "max_tokens": 4000
    },
    "coder": {
        "name": "Coder",
        "model": "claude-3-opus-20240229", 
        "temperature": 0.1,
        "max_tokens": 4000
    },
    "reviewer": {
        "name": "Reviewer",
        "model": "claude-3-opus-20240229",
        "temperature": 0.1,
        "max_tokens": 2000
    },
    "tester": {
        "name": "Tester",
        "model": "claude-3-opus-20240229",
        "temperature": 0.2,
        "max_tokens": 3000
    },
    "documenter": {
        "name": "Documenter",
        "model": "claude-3-opus-20240229",
        "temperature": 0.3,
        "max_tokens": 3000
    }
}

# 成本限制 (防止意外高消费)
MAX_COST_PER_REQUEST = 0.5  # $0.50
DAILY_COST_LIMIT = 10.0     # $10.00

# 超时设置
REQUEST_TIMEOUT = 300       # 5分钟
WORKFLOW_TIMEOUT = 1800     # 30分钟

# 输出配置
OUTPUT_DIR = "./generated"
SAVE_INTERMEDIATE = True

# 日志配置
LOG_LEVEL = "INFO"
LOG_FILE = "./logs/oaeas_claude_code.log"
