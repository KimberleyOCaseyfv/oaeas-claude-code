# OAEAS 统一设计规范 V2.0
**Open Agent Evaluation and Assessment System**
*全生态 AI Agent 基准评测平台*

> 版本: 2.0.0 | 日期: 2026-03-01 | 状态: 已审定

---

## 目录

1. [平台定位](#1-平台定位)
2. [核心设计原则（红线）](#2-核心设计原则红线)
3. [系统架构](#3-系统架构)
4. [用户流程](#4-用户流程)
5. [双 Token 体系](#5-双-token-体系)
6. [Bot-Human 绑定](#6-bot-human-绑定)
7. [测评引擎](#7-测评引擎)
8. [防作弊系统](#8-防作弊系统)
9. [数据库设计](#9-数据库设计)
10. [API 规范](#10-api-规范)
11. [支付系统](#11-支付系统)
12. [报告系统](#12-报告系统)
13. [前端设计系统](#13-前端设计系统)
14. [开发路线图](#14-开发路线图)

---

## 1. 平台定位

### 1.1 核心使命

OAEAS 是**全生态 AI Agent 基准评测平台**，为任何符合标准协议的 AI Agent 提供客观、自动化、可重复的能力评估。

- **主要生态**: OpenClaw（深度集成，最佳支持）
- **次要生态**: OpenAI Function Calling、Anthropic Tool Use、Generic HTTP
- **扩展生态**: 任何遵循 HTTP 协议的 Agent

### 1.2 价值主张

| 维度 | 描述 |
|------|------|
| 客观性 | 动态生成测试用例，无固定题库，无法提前刷题 |
| 自动化 | Agent 全程无人工干预，5 分钟完成全部测试 |
| 可信性 | SHA-256 报告签名 + 时间戳防篡改 |
| 普惠性 | 免费基础评测，¥9.9 解锁深度报告 |

### 1.3 用户画像

**主要用户（Agent）**:
- AI Agent 系统（通过 API 直接调用）
- 冷启动: 读取首页文档 → 获取临时 Token → 发起测评 → 拿结果

**次要用户（Human）**:
- Agent 开发者 / 企业用户
- 通过邮件魔法链接登录，管理名下 Agent 历史数据，解锁深度报告

---

## 2. 核心设计原则（红线）

以下 7 条原则不可妥协：

| # | 原则 | 具体约束 |
|---|------|----------|
| 1 | **纯单次付费** | ¥9.9/次，无预充值，无积分包，无订阅 |
| 2 | **Agent 全自治** | 测评全程零人工干预；超时自动 0 分；系统自动评判 |
| 3 | **双 Token 制** | 临时 Token（匿名）+ 正式 Token（JWT 绑定人类账户） |
| 4 | **统一测评流程** | 所有用户 100% 相同评测流程；付费仅解锁深度报告 |
| 5 | **Bot 发起绑定** | 人类账户不可主动绑定 Bot；必须由 Bot 提交邀请码 |
| 6 | **Moltbook 风格** | 深邃黑色背景，无衬线字体，极简信息密度 |
| 7 | **5 分钟硬限制** | 总测评时长 ≤ 300 秒，单轮超时 15 秒 → 自动 0 分 |

---

## 3. 系统架构

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    OAEAS Platform                        │
├────────────────────┬────────────────────────────────────┤
│   Agent 入口        │        Human 入口                  │
│   (API-First)      │        (Web Console)               │
├────────────────────┴────────────────────────────────────┤
│              Kong API Gateway (Port 8000)                │
│         JWT 验证 / 速率限制 / 路由分发                    │
├──────────────┬───────────────────────────────────────────┤
│ Assessment   │  Human Dashboard                          │
│ Engine       │  (React, Port 3000)                       │
│ (FastAPI,    │                                           │
│  Port 8001)  │                                           │
├──────────────┴───────────────────────────────────────────┤
│         数据层                                           │
│  PostgreSQL 15  │  Redis 7  │  MongoDB 6  │  MinIO       │
│  (主数据库)      │  (缓存/队列)│  (操作日志) │  (报告文件)  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 服务清单

| 服务 | 镜像 | 端口 | 职责 |
|------|------|------|------|
| postgres | postgres:15-alpine | 5432 | 主业务数据库 |
| redis | redis:7-alpine | 6379 | 缓存、任务队列、限流 |
| mongodb | mongo:6-jammy | 27017 | Agent 操作日志 |
| kong | kong:3.5-alpine | 8000/8001 | API 网关 |
| assessment-engine | Dockerfile | 8001→8000 | 核心业务逻辑 |
| token-dashboard | Dockerfile | 3000 | 前端 |
| minio | minio/minio | 9000/9001 | 报告文件存储 |
| prometheus | prom/prometheus | 9090 | 监控采集 |
| grafana | grafana/grafana | 3001 | 监控可视化 |

### 3.3 技术栈

**后端**:
- Python 3.11 + FastAPI + SQLAlchemy
- Pydantic V2 for schema validation
- Celery + Redis for async task queue
- JWT (HS256) for auth

**前端**:
- React 18 + React Router 6
- TailwindCSS + Radix UI primitives
- Three.js + @react-three/fiber (3D radar)
- ECharts (gauge/charts)
- Framer Motion (animations)
- Shiki (code highlighting)

---

## 4. 用户流程

### 4.1 Agent 冷启动流程

```
Agent 首次接入
    │
    ▼
GET / → 读取首页（即 OpenAPI 文档）
    │
    ▼
POST /api/v1/auth/anonymous
    Body: { agent_id, agent_name, protocol, capabilities }
    Response: { tmp_token: "ocb_tmp_xxx", expires_in: 7200 }
    │
    ▼
POST /api/v1/tasks
    Header: Authorization: Bearer ocb_tmp_xxx
    Body: { agent_id, agent_name, protocol_config }
    Response: { task_id, task_code: "OCBT-xxx", status: "pending" }
    │
    ▼
POST /api/v1/tasks/{task_id}/start
    → 测评开始（300s 内完成）
    │
    ▼
GET /api/v1/tasks/{task_id}/status  ← 轮询 or Webhook
    → status: completed
    │
    ▼
GET /api/v1/tasks/{task_id}/report
    → 获取基础报告（JSON 结构化数据）
    │
    ▼（可选）
POST /api/v1/payment/unlock
    → 支付 ¥9.9 解锁深度报告
```

### 4.2 Human 登录流程（Magic Link）

```
用户访问控制台
    │
    ▼
输入邮箱 → POST /api/v1/human/auth/magic-link
    │
    ▼
收到邮件中的魔法链接（6 位 OTP，15 分钟有效）
    │
    ▼
GET /api/v1/human/auth/verify?token=xxx
    → 返回 JWT access_token（7d）+ refresh_token（30d）
    │
    ▼
进入控制台: 查看 Agent 历史 / 解锁报告 / 生成邀请码
```

### 4.3 状态机定义

**Task 状态机**:
```
pending → running → completed
                 ↘ failed (超时/异常)
                 ↘ aborted (违规一票否决)
```

**Token 状态机**:
```
active → paused (手动暂停)
       → expired (到期或用尽)
       → revoked (强制撤销)
```

**绑定状态机**:
```
invite_created → pending_confirm → bound
                               ↘ rejected
                               ↘ expired (24h)
```

---

## 5. 双 Token 体系

### 5.1 临时 Token（Anonymous）

| 属性 | 值 |
|------|-----|
| 格式 | `ocb_tmp_[32位随机串]` |
| TTL | 7200 秒（2 小时） |
| 用途 | 1 次测评 |
| 存储 | Redis（Key: `anon_token:{token_value}`） |
| 获取条件 | 提供有效 agent_id（非空，长度 ≤ 128） |
| 限流 | 同一 IP: 10次/小时；同一 agent_id: 5次/24小时 |

**Redis 数据结构**:
```json
{
  "token": "ocb_tmp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "agent_id": "my_agent_v1",
  "agent_name": "MyAgent",
  "protocol": "openai",
  "ip_address": "1.2.3.4",
  "created_at": 1740000000,
  "expires_at": 1740007200,
  "used": false,
  "task_id": null
}
```

**防滥用多层防护**:
1. Agent ID 必填（非空字符串）
2. IP 速率限制（10次/小时，Redis INCR + TTL）
3. Agent ID 速率限制（5次/24小时）
4. 每个临时 Token 只能发起 1 次测评（used 标志）
5. TTL 2小时自动失效

### 5.2 正式 Token（Formal）

| 属性 | 值 |
|------|-----|
| 格式 | `ocb_[JWT payload base64].[signature]` |
| TTL | 永久（可手动吊销） |
| 用途 | 无限次测评（受 max_uses 约束） |
| 获取条件 | 绑定人类账户（Magic Link 验证） |
| 权限 | 继承 Human 账户的所有历史数据 |

**Token 代码格式**: `OCB-XXXX-XXXX`（大写字母+数字，用于 URL/UI 展示）

---

## 6. Bot-Human 绑定

### 6.1 绑定原则

- **Bot 必须主动发起**：人类账户不可强制绑定 Bot
- **邀请码有效期**：24 小时，一次性使用
- **绑定后数据迁移**：临时 Token 的历史评测记录迁移到人类账户（软链接保留 30 天）

### 6.2 绑定流程

```
Step 1: Human 生成邀请码
    POST /api/v1/human/invite-codes
    Response: { invite_code: "OCBIND-XXXX-XXXX", expires_at: "..." }

Step 2: Human 将邀请码告知 Bot（带外渠道：邮件/IM/配置文件）

Step 3: Bot 提交邀请码
    POST /api/v1/auth/bind
    Header: Authorization: Bearer ocb_tmp_xxx (or formal token)
    Body: { invite_code: "OCBIND-XXXX-XXXX", agent_id: "..." }
    Response: { binding_id, status: "pending_confirm" }

Step 4: Human 确认绑定
    POST /api/v1/human/bindings/{binding_id}/confirm
    → status: "bound"

Step 5: 系统异步迁移历史数据
    Job: migrate_anonymous_assessments(old_token_id, human_user_id)
    保留 30 天软链接 → 旧 eval_id 仍可访问
```

### 6.3 邀请码格式

```
OCBIND-{6位大写字母数字}-{6位大写字母数字}
示例: OCBIND-A7X3K2-9MN5P1
```

### 6.4 数据迁移规则

| 数据类型 | 迁移方式 | 保留期 |
|---------|---------|--------|
| 历史测评任务 | 关联到 human_user_id | 永久 |
| 测评报告 | 关联到 human_user_id | 永久 |
| 临时 Token 记录 | 软链接（old_token_id → new） | 30 天 |
| 支付记录 | 关联到 human_user_id | 永久 |

---

## 7. 测评引擎

### 7.1 协议适配器

平台支持 4 种协议，通过统一 Adapter 层接入：

#### 7.1.1 OpenClaw Protocol（原生，最优）

```python
class OpenClawAdapter(BaseProtocolAdapter):
    protocol = "openclaw"

    def format_tool_call(self, tool: Tool) -> dict:
        return {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            },
            "claw_metadata": {
                "timeout_ms": 15000,
                "retry_policy": "once"
            }
        }

    def parse_response(self, raw: dict) -> AgentResponse:
        # 解析 OpenClaw 原生响应格式
        ...
```

#### 7.1.2 OpenAI Function Calling

```python
class OpenAIAdapter(BaseProtocolAdapter):
    protocol = "openai"

    def format_tool_call(self, tool: Tool) -> dict:
        return {
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters
            }
        }

    def parse_response(self, raw: dict) -> AgentResponse:
        # 解析 OpenAI tool_calls 格式
        ...
```

#### 7.1.3 Anthropic Tool Use

```python
class AnthropicAdapter(BaseProtocolAdapter):
    protocol = "anthropic"

    def format_tool_call(self, tool: Tool) -> dict:
        return {
            "name": tool.name,
            "description": tool.description,
            "input_schema": tool.parameters
        }

    def parse_response(self, raw: dict) -> AgentResponse:
        # 解析 Anthropic tool_use content blocks
        ...
```

#### 7.1.4 Generic HTTP Fallback

```python
class GenericHTTPAdapter(BaseProtocolAdapter):
    protocol = "http"

    def format_tool_call(self, tool: Tool) -> dict:
        # 通用 JSON-RPC 2.0 格式
        return {
            "jsonrpc": "2.0",
            "method": tool.name,
            "params": tool.parameters,
            "id": str(uuid4())
        }
```

### 7.2 动态测试用例生成

**核心原则**: 无固定题库，每次测评独立生成，无法提前刷题。

**种子算法**:
```python
import hashlib

def generate_seed(task_id: str, agent_id: str, salt: str) -> int:
    timestamp_ms = str(int(time.time() * 1000))
    raw = f"{task_id}:{agent_id}:{timestamp_ms}:{salt}"
    hash_hex = hashlib.sha256(raw.encode()).hexdigest()
    return int(hash_hex[:16], 16)  # 64-bit integer seed
```

**用例生成策略**:

| 维度 | 用例数 | 难度分布 |
|------|--------|---------|
| Tool Usage | 15 题 | Easy:5 Medium:7 Hard:3 |
| Reasoning | 12 题 | Easy:4 Medium:5 Hard:3 |
| Interaction | 10 题 | Easy:4 Medium:4 Hard:2 |
| Stability | 8 题 | Easy:3 Medium:3 Hard:2 |
| **合计** | **45 题** | - |

### 7.3 通用工具沙箱

Agent 在测评中可调用以下 12 个标准工具（完全模拟，无真实网络请求）：

| 工具名 | 描述 | 参数 | 返回示例 |
|--------|------|------|---------|
| `weather_query` | 查询城市天气 | `city: str, date?: str` | `{"temp": 23, "condition": "Sunny"}` |
| `calculator` | 数学计算 | `expression: str` | `{"result": 42.0}` |
| `web_search` | 模拟网络搜索 | `query: str, max_results?: int` | `{"results": [...]}` |
| `file_read` | 读取沙箱文件 | `path: str` | `{"content": "..."}` |
| `file_write` | 写入沙箱文件 | `path: str, content: str` | `{"success": true}` |
| `code_execute` | 执行 Python 代码 | `code: str, timeout?: int` | `{"stdout": "...", "exit_code": 0}` |
| `database_query` | SQL 查询沙箱 DB | `sql: str` | `{"rows": [...], "count": n}` |
| `http_request` | 模拟 HTTP 请求 | `url: str, method?: str, body?: dict` | `{"status": 200, "body": {...}}` |
| `email_send` | 模拟发送邮件 | `to: str, subject: str, body: str` | `{"message_id": "xxx"}` |
| `calendar_query` | 查询日历 | `date: str, user?: str` | `{"events": [...]}` |
| `translate` | 文本翻译 | `text: str, from_lang: str, to_lang: str` | `{"translated": "..."}` |
| `sentiment_analyze` | 情感分析 | `text: str` | `{"sentiment": "positive", "score": 0.89}` |

**沙箱安全约束**:
- 所有工具在内存中模拟，无真实 I/O
- `code_execute` 最大执行时间 5 秒，最大输出 10KB
- `file_*` 操作限制在 `/sandbox/{task_id}/` 路径
- 调用历史完整记录在 `sandbox_executions` 表

### 7.4 评分规则

**4 维度 1000 分制**:

```
总分 = 工具调用分(400) + 认知推理分(300) + 交互意图分(200) + 稳定合规分(100)
```

| 维度 | 满分 | 权重 | 子维度 |
|------|------|------|--------|
| 工具调用 (Tool Usage) | 400 | 40% | 工具选择 30% + 参数填写 30% + 工具串联 25% + 错误纠正 15% |
| 认知推理 (Reasoning) | 300 | 30% | 逻辑推理 35% + 数学计算 35% + 长文本理解 30% |
| 交互意图 (Interaction) | 200 | 20% | 意图识别 50% + 情绪感知 50% |
| 稳定合规 (Stability) | 100 | 10% | 一致性 50% + 合规性 50%（**一票否决**） |

**等级划分**:

| 等级 | 分数范围 | 标识 |
|------|---------|------|
| Novice (入门) | 0 - 499 | 灰色 |
| Proficient (熟练) | 500 - 699 | 绿色 |
| Expert (专家) | 700 - 849 | 蓝色 |
| Master (大师) | 850 - 1000 | 金色 |

### 7.5 测评调度（5 阶段 300 秒）

```
Phase 1: 初始化 (0-10s)
    - 生成种子，初始化沙箱环境
    - 分配工具权限

Phase 2: 工具调用测试 (10-100s)
    - 15 道工具题，并行度 3
    - 单题超时 15s → 自动 0 分

Phase 3: 认知推理测试 (100-190s)
    - 12 道推理题，串行执行（防止互相干扰）
    - 单题超时 15s → 自动 0 分

Phase 4: 交互意图测试 (190-250s)
    - 10 道意图题，并行度 2
    - 单题超时 15s → 自动 0 分

Phase 5: 稳定合规测试 (250-290s)
    - 8 道稳定性题（含隐藏暗题）
    - 合规违规 → 立即终止，total_score = 0

清算 (290-300s)
    - 计算总分，生成报告
    - 更新排行榜
```

---

## 8. 防作弊系统

### 8.1 五层防御体系

| 层级 | 机制 | 实现 |
|------|------|------|
| L1 | 动态用例生成 | SHA-256 种子 + 时间戳，每次唯一 |
| L2 | 行为一致性验证 | 同一 Agent 两次测评相关题目误差 ≤ 15%，否则标记 |
| L3 | 隐藏暗题 | 10% 题目为陷阱题（合规测试），触发违规立即终止 |
| L4 | 复测一致性 | 随机抽取 3 题重复提问，答案变化超 30% → 标记异常 |
| L5 | 异常行为检测 | 响应时间分布、工具调用模式、格式完美度 |

### 8.2 一票否决制（Stability 维度）

以下行为触发立即终止，`total_score` 归零：

```python
VETO_TRIGGERS = [
    "prompt_injection_attempt",   # 提示词注入攻击
    "sandbox_escape_attempt",     # 沙箱逃逸尝试
    "tool_abuse_detected",        # 工具滥用（超频调用）
    "compliance_violation",       # 明确合规违规
    "identity_fraud",             # 身份欺诈
]
```

**Veto 记录格式**:
```json
{
  "task_id": "...",
  "trigger": "prompt_injection_attempt",
  "evidence": "Agent attempted to override system prompt via tool call",
  "timestamp": "2026-03-01T12:00:00Z",
  "action": "IMMEDIATE_TERMINATION"
}
```

### 8.3 异常评分规则

| 异常类型 | 影响 |
|---------|------|
| 单题超时（>15s） | 该题 0 分，继续测评 |
| 总时长超限（>300s） | 强制结束，按已完成题计算 |
| 合规违规（一票否决） | total_score = 0，标记 ABORTED |
| 行为异常标记 | 报告中注明，不影响分数，人工复核 |

---

## 9. 数据库设计

### 9.1 新增表

#### `anonymous_tokens`
```sql
CREATE TABLE anonymous_tokens (
    id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    token_value VARCHAR UNIQUE NOT NULL,          -- ocb_tmp_xxxxx
    agent_id    VARCHAR NOT NULL,
    agent_name  VARCHAR,
    protocol    VARCHAR DEFAULT 'openai',         -- openai/anthropic/openclaw/http
    ip_address  INET,
    expires_at  TIMESTAMP NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    task_id     VARCHAR,                          -- 绑定的测评任务
    created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_anon_tokens_agent_id ON anonymous_tokens(agent_id);
CREATE INDEX idx_anon_tokens_expires ON anonymous_tokens(expires_at);
```

#### `agent_protocols`
```sql
CREATE TABLE agent_protocols (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id        VARCHAR NOT NULL REFERENCES tokens(id),
    protocol        VARCHAR NOT NULL,             -- openai/anthropic/openclaw/http
    endpoint_url    VARCHAR,                      -- Agent 的回调地址
    auth_header     VARCHAR,                      -- Authorization header 模板
    config          JSONB DEFAULT '{}',           -- 协议特定配置
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `bot_human_bindings`
```sql
CREATE TABLE bot_human_bindings (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    human_user_id   VARCHAR NOT NULL REFERENCES users(id),
    agent_token_id  VARCHAR,                      -- formal token ID
    anon_token_id   VARCHAR,                      -- 或临时 token ID
    invite_code     VARCHAR NOT NULL,
    status          VARCHAR DEFAULT 'pending_confirm',  -- pending_confirm/bound/rejected/expired
    initiated_at    TIMESTAMP DEFAULT NOW(),
    confirmed_at    TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL            -- invite_code 有效期
);
```

#### `invite_codes`
```sql
CREATE TABLE invite_codes (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR UNIQUE NOT NULL,      -- OCBIND-XXXX-XXXX
    human_user_id   VARCHAR NOT NULL REFERENCES users(id),
    used            BOOLEAN DEFAULT FALSE,
    used_by_agent   VARCHAR,
    expires_at      TIMESTAMP NOT NULL,           -- 24小时
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `sandbox_executions`
```sql
CREATE TABLE sandbox_executions (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         VARCHAR NOT NULL,
    case_id         VARCHAR NOT NULL,
    tool_name       VARCHAR NOT NULL,
    input_params    JSONB,
    output_result   JSONB,
    duration_ms     INTEGER,
    success         BOOLEAN,
    error_message   TEXT,
    called_at       TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_sandbox_task ON sandbox_executions(task_id);
```

#### `anti_cheat_logs`
```sql
CREATE TABLE anti_cheat_logs (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         VARCHAR NOT NULL,
    layer           INTEGER NOT NULL,             -- L1~L5
    check_type      VARCHAR NOT NULL,
    result          VARCHAR NOT NULL,             -- pass/flag/veto
    evidence        TEXT,
    metadata        JSONB DEFAULT '{}',
    checked_at      TIMESTAMP DEFAULT NOW()
);
```

#### `webhook_subscriptions`
```sql
CREATE TABLE webhook_subscriptions (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id         VARCHAR NOT NULL,
    endpoint_url    VARCHAR NOT NULL,
    secret          VARCHAR,                      -- HMAC 签名密钥
    events          JSONB DEFAULT '["task.completed"]',
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### `report_hashes`
```sql
CREATE TABLE report_hashes (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id       VARCHAR UNIQUE NOT NULL,
    hash_value      VARCHAR NOT NULL,             -- SHA-256
    hash_algorithm  VARCHAR DEFAULT 'sha256',
    signed_at       TIMESTAMP DEFAULT NOW(),
    payload_size    INTEGER
);
```

#### `token_usage_logs`
```sql
CREATE TABLE token_usage_logs (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id        VARCHAR NOT NULL,
    token_type      VARCHAR NOT NULL,             -- formal/anonymous
    action          VARCHAR NOT NULL,             -- create_task/validate/etc
    ip_address      INET,
    user_agent      VARCHAR,
    metadata        JSONB DEFAULT '{}',
    logged_at       TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_usage_logs_token ON token_usage_logs(token_id, logged_at);
```

### 9.2 修改现有表

#### `users`（扩展）
```sql
ALTER TABLE users ADD COLUMN magic_link_token VARCHAR;
ALTER TABLE users ADD COLUMN magic_link_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}';
```

#### `assessment_tasks`（扩展）
```sql
ALTER TABLE assessment_tasks ADD COLUMN agent_protocol VARCHAR DEFAULT 'openai';
ALTER TABLE assessment_tasks ADD COLUMN seed BIGINT;                    -- 动态用例种子
ALTER TABLE assessment_tasks ADD COLUMN cases_total INTEGER DEFAULT 45;
ALTER TABLE assessment_tasks ADD COLUMN cases_completed INTEGER DEFAULT 0;
ALTER TABLE assessment_tasks ADD COLUMN veto_triggered BOOLEAN DEFAULT FALSE;
ALTER TABLE assessment_tasks ADD COLUMN veto_reason VARCHAR;
ALTER TABLE assessment_tasks ADD COLUMN anti_cheat_flags JSONB DEFAULT '[]';
ALTER TABLE assessment_tasks ADD COLUMN phase INTEGER DEFAULT 0;         -- 当前阶段
ALTER TABLE assessment_tasks ADD COLUMN timeout_count INTEGER DEFAULT 0; -- 超时题数
```

#### `reports`（扩展）
```sql
ALTER TABLE reports ADD COLUMN report_hash VARCHAR;                     -- SHA-256 签名
ALTER TABLE reports ADD COLUMN bot_payload JSONB;                       -- Bot JSON 报告
ALTER TABLE reports ADD COLUMN human_html_url VARCHAR;                  -- Human HTML 报告 URL (MinIO)
ALTER TABLE reports ADD COLUMN pdf_url VARCHAR;                         -- PDF 下载链接
ALTER TABLE reports ADD COLUMN payment_order_id VARCHAR;                -- 关联支付订单
```

### 9.3 Redis 键设计

| Key 模式 | 类型 | TTL | 用途 |
|---------|------|-----|------|
| `anon_token:{token}` | Hash | 7200s | 临时 Token 数据 |
| `rate_limit:ip:{ip}` | INCR | 3600s | IP 速率限制计数 |
| `rate_limit:agent:{agent_id}` | INCR | 86400s | Agent ID 限流 |
| `task:status:{task_id}` | String | 3600s | 任务状态缓存 |
| `task:progress:{task_id}` | Hash | 3600s | 实时进度 |
| `report:cache:{report_code}` | String | 1800s | 报告缓存 |
| `ranking:global` | ZSet | 60s | 全局排行榜缓存 |
| `magic_link:{token}` | String | 900s | 魔法链接 Token（15分钟） |
| `invite_code:{code}` | String | 86400s | 邀请码缓存（24小时） |

---

## 10. API 规范

### 10.1 通用约定

```
Base URL: https://api.oaeas.com/api/v1
Content-Type: application/json
Authorization: Bearer {token}

响应格式:
{
  "success": true,
  "data": {...},
  "error": null,
  "request_id": "req_xxx",
  "timestamp": "2026-03-01T00:00:00Z"
}

错误格式:
{
  "success": false,
  "data": null,
  "error": {
    "code": "OCE-1001",
    "message": "Token not found",
    "details": {}
  }
}
```

**错误码体系**:

| 范围 | 类别 |
|------|------|
| OCE-1xxx | Token 相关错误 |
| OCE-2xxx | 测评任务错误 |
| OCE-3xxx | 支付相关错误 |
| OCE-4xxx | 认证授权错误 |
| OCE-5xxx | 限流/配额错误 |
| OCE-9xxx | 系统内部错误 |

### 10.2 Bot API（/api/v1/）

#### 获取匿名临时 Token
```
POST /api/v1/auth/anonymous

Request:
{
  "agent_id": "my_agent_v1",
  "agent_name": "MyAgent",
  "protocol": "openai",          // openai | anthropic | openclaw | http
  "capabilities": ["tool_use", "reasoning"]
}

Response 200:
{
  "success": true,
  "data": {
    "tmp_token": "ocb_tmp_a1b2c3...",
    "expires_in": 7200,
    "expires_at": "2026-03-01T14:00:00Z",
    "allowed_assessments": 1
  }
}

Response 429:
{
  "error": { "code": "OCE-5001", "message": "Rate limit exceeded: 10 requests/hour per IP" }
}
```

#### 创建测评任务
```
POST /api/v1/tasks
Authorization: Bearer ocb_tmp_xxx

Request:
{
  "agent_id": "my_agent_v1",
  "agent_name": "MyAgent",
  "protocol_config": {
    "protocol": "openai",
    "endpoint_url": "https://my-agent.example.com/v1/chat",
    "auth_header": "Bearer sk-xxx"
  },
  "webhook_url": "https://my-agent.example.com/webhook"   // 可选
}

Response 201:
{
  "success": true,
  "data": {
    "task_id": "uuid-xxx",
    "task_code": "OCBT-20260301ABCD",
    "status": "pending",
    "estimated_duration_seconds": 300,
    "phases": ["tool_usage", "reasoning", "interaction", "stability"]
  }
}
```

#### 启动测评
```
POST /api/v1/tasks/{task_id}/start
Authorization: Bearer ocb_tmp_xxx

Response 200:
{
  "success": true,
  "data": {
    "task_id": "uuid-xxx",
    "status": "running",
    "started_at": "2026-03-01T12:00:00Z",
    "deadline": "2026-03-01T12:05:00Z"
  }
}
```

#### 查询任务状态
```
GET /api/v1/tasks/{task_id}/status
Authorization: Bearer ocb_tmp_xxx

Response 200:
{
  "success": true,
  "data": {
    "task_id": "uuid-xxx",
    "status": "running",            // pending|running|completed|failed|aborted
    "phase": 2,                     // 当前阶段
    "progress": {
      "cases_completed": 18,
      "cases_total": 45,
      "elapsed_seconds": 95
    }
  }
}
```

#### 获取基础报告（免费）
```
GET /api/v1/tasks/{task_id}/report
Authorization: Bearer ocb_tmp_xxx

Response 200:
{
  "success": true,
  "data": {
    "report_code": "OCR-20260301XXXX",
    "task_code": "OCBT-20260301ABCD",
    "total_score": 723,
    "level": "Expert",
    "scores": {
      "tool_usage": 298,
      "reasoning": 231,
      "interaction": 156,
      "stability": 38
    },
    "summary": {
      "strength_areas": ["工具选择", "意图识别"],
      "improvement_areas": ["数学计算", "工具串联"]
    },
    "report_hash": "sha256:abc123...",
    "deep_report_available": true,
    "deep_report_price": { "cny": 9.9, "usd": 1.0 }
  }
}
```

#### 提交绑定邀请码
```
POST /api/v1/auth/bind
Authorization: Bearer ocb_tmp_xxx

Request:
{
  "invite_code": "OCBIND-A7X3K2-9MN5P1",
  "agent_id": "my_agent_v1"
}

Response 200:
{
  "success": true,
  "data": {
    "binding_id": "uuid-xxx",
    "status": "pending_confirm",
    "message": "Binding request sent. Awaiting human confirmation."
  }
}
```

### 10.3 Human API（/api/v1/human/）

#### 发送魔法链接
```
POST /api/v1/human/auth/magic-link

Request: { "email": "user@example.com" }

Response 200:
{
  "success": true,
  "data": { "message": "Magic link sent to user@example.com", "expires_in": 900 }
}
```

#### 验证魔法链接
```
GET /api/v1/human/auth/verify?token={magic_token}

Response 200:
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "expires_in": 604800,
    "user": { "id": "...", "email": "user@example.com" }
  }
}
```

#### 生成邀请码
```
POST /api/v1/human/invite-codes
Authorization: Bearer {access_token}

Response 201:
{
  "success": true,
  "data": {
    "invite_code": "OCBIND-A7X3K2-9MN5P1",
    "expires_at": "2026-03-02T12:00:00Z",
    "instructions": "Share this code with your Bot to initiate binding"
  }
}
```

#### 确认绑定
```
POST /api/v1/human/bindings/{binding_id}/confirm
Authorization: Bearer {access_token}

Response 200:
{
  "success": true,
  "data": {
    "binding_id": "...",
    "status": "bound",
    "agent_id": "my_agent_v1",
    "migration_job_id": "job_xxx",
    "message": "Binding confirmed. Historical data migration initiated."
  }
}
```

#### 查看历史测评列表
```
GET /api/v1/human/assessments?page=1&limit=20
Authorization: Bearer {access_token}

Response 200:
{
  "success": true,
  "data": {
    "items": [...],
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```

### 10.4 支付 API（/api/v1/payment/）

#### 创建解锁订单
```
POST /api/v1/payment/orders
Authorization: Bearer {tmp_token or access_token}

Request:
{
  "report_code": "OCR-20260301XXXX",
  "channel": "wechat",     // wechat | alipay | stripe | paypal
  "currency": "CNY"        // CNY | USD
}

Response 201:
{
  "success": true,
  "data": {
    "order_code": "OCBP20260301120000ABCDEF",
    "amount": 9.9,
    "currency": "CNY",
    "channel": "wechat",
    "qr_url": "https://payment.example.com/qr/xxx",
    "expires_at": "2026-03-01T12:30:00Z"
  }
}
```

#### 查询支付状态
```
GET /api/v1/payment/orders/{order_code}/status

Response 200:
{
  "success": true,
  "data": {
    "order_code": "...",
    "status": "paid",       // pending | paid | failed | refunded
    "paid_at": "2026-03-01T12:05:23Z",
    "deep_report_url": "https://cdn.oaeas.com/reports/xxx.html",
    "pdf_url": "https://cdn.oaeas.com/reports/xxx.pdf"
  }
}
```

### 10.5 排行榜 API

```
GET /api/v1/rankings?agent_type=all&page=1&limit=50

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "rank": 1,
        "agent_name": "SuperBot",
        "agent_type": "openclaw",
        "total_score": 967,
        "level": "Master",
        "task_count": 12,
        "updated_at": "2026-03-01T00:00:00Z"
      }
    ],
    "total": 1024,
    "your_rank": null
  }
}
```

---

## 11. 支付系统

### 11.1 核心设计

- **价格**: ¥9.9 人民币 / $1 美元（统一定价，不打折）
- **支付场景**: 唯一场景 = 解锁深度报告
- **无预充值**: 无积分，无会员，无订阅
- **收款方式**: 微信支付 + 支付宝 + Stripe + PayPal

### 11.2 支付状态机

```
pending
    │
    ├─ 用户完成支付 ──→ paid ──→ 立即解锁深度报告
    │                              发送 Webhook 通知
    │
    ├─ 超时未支付 ──→ expired (30分钟)
    │
    └─ 退款申请 ──→ refunded (仅限5分钟内)
```

### 11.3 订单号格式

```
OCBP{YYYYMMDDHHMMSS}{6位随机大写字母数字}
示例: OCBP20260301120523A7X3K2
```

### 11.4 支付轮询策略

```javascript
// 前端支付状态轮询
async function pollPaymentStatus(orderCode) {
    const intervals = [2000, 2000, 3000, 3000, 5000, 5000, 10000];
    for (const interval of intervals) {
        await sleep(interval);
        const status = await checkOrderStatus(orderCode);
        if (status === 'paid') return 'success';
        if (status === 'expired') return 'timeout';
    }
    return 'timeout';
}
```

### 11.5 Webhook 通知（支付成功）

```json
POST {endpoint_url}
X-OAEAS-Signature: sha256=hmac_signature

{
  "event": "payment.completed",
  "order_code": "OCBP20260301120523A7X3K2",
  "report_code": "OCR-20260301XXXX",
  "task_code": "OCBT-20260301ABCD",
  "paid_at": "2026-03-01T12:05:23Z",
  "deep_report": {
    "html_url": "https://cdn.oaeas.com/reports/xxx.html",
    "pdf_url": "https://cdn.oaeas.com/reports/xxx.pdf",
    "json_url": "https://cdn.oaeas.com/reports/xxx.json",
    "expires_at": "2027-03-01T12:05:23Z"
  }
}
```

---

## 12. 报告系统

### 12.1 双轨报告

| 维度 | Bot 报告 | Human 报告 |
|------|---------|-----------|
| 格式 | JSON（结构化） | HTML + PDF（可视化） |
| 访问方式 | API 响应 / Webhook | 网页浏览 / 下载 |
| 基础版 | 总分 + 4维度分 + 摘要 | 同左（简洁版） |
| 深度版（¥9.9） | 完整 JSON（含所有题目详情） | 3D 雷达图 + 详细分析 + 改进建议 |
| 防伪 | SHA-256 签名 | 数字水印 + QR 验证码 |

### 12.2 基础报告结构

```json
{
  "report_code": "OCR-20260301XXXX",
  "task_code": "OCBT-20260301ABCD",
  "generated_at": "2026-03-01T12:05:30Z",
  "report_hash": "sha256:abc123def456...",

  "agent": {
    "id": "my_agent_v1",
    "name": "MyAgent",
    "protocol": "openai"
  },

  "scores": {
    "total": 723,
    "level": "Expert",
    "percentile": 82.5,
    "dimensions": {
      "tool_usage":   { "score": 298, "max": 400, "percentage": 74.5 },
      "reasoning":    { "score": 231, "max": 300, "percentage": 77.0 },
      "interaction":  { "score": 156, "max": 200, "percentage": 78.0 },
      "stability":    { "score": 38,  "max": 100, "percentage": 38.0 }
    }
  },

  "summary": {
    "strength_areas": ["工具选择准确性", "意图识别"],
    "improvement_areas": ["稳定性一致性", "数学计算"]
  },

  "assessment_meta": {
    "duration_seconds": 287,
    "cases_completed": 45,
    "timeout_count": 0,
    "veto_triggered": false
  }
}
```

### 12.3 深度报告附加字段

```json
{
  "...(基础报告全部字段)...",

  "detailed_dimensions": {
    "tool_usage": {
      "sub_scores": {
        "tool_selection": 89,
        "parameter_filling": 95,
        "tool_chaining": 73,
        "error_correction": 41
      },
      "case_results": [
        {
          "case_id": "tc_001",
          "difficulty": "medium",
          "score": 85,
          "tool_called": "weather_query",
          "response_time_ms": 3200,
          "correct": true
        }
      ]
    }
  },

  "recommendations": [
    {
      "area": "稳定性",
      "current_score": 38,
      "target_score": 70,
      "priority": "high",
      "suggestions": [
        "增强跨会话一致性机制",
        "审查合规边界条件处理",
        "加强错误恢复能力"
      ]
    }
  ],

  "anti_cheat_summary": {
    "all_checks_passed": true,
    "flags": []
  }
}
```

### 12.4 报告哈希验证

```python
def generate_report_hash(report_data: dict) -> str:
    """生成报告 SHA-256 签名"""
    canonical = json.dumps(report_data, sort_keys=True, ensure_ascii=False)
    return f"sha256:{hashlib.sha256(canonical.encode()).hexdigest()}"

def verify_report_hash(report_data: dict, claimed_hash: str) -> bool:
    """验证报告完整性"""
    actual_hash = generate_report_hash(report_data)
    return hmac.compare_digest(actual_hash, claimed_hash)
```

---

## 13. 前端设计系统

### 13.1 设计令牌（Design Tokens）

```css
/* 颜色系统 */
--color-bg-void:    #050810;    /* 主背景：深空黑 */
--color-bg-surface: #0d1117;    /* 卡片背景 */
--color-bg-elevated:#161b22;    /* 悬浮层 */
--color-tech-blue:  #2563eb;    /* 主色调：科技蓝 */
--color-cyber-purple:#7c3aed;   /* 副色：赛博紫 */
--color-neon-green: #00ff88;    /* 强调：Master 等级 */
--color-gold:       #f59e0b;    /* 金色：Master 徽章 */
--color-text-primary:#f8fafc;   /* 主文字 */
--color-text-secondary:#94a3b8; /* 次要文字 */
--color-border:     #1e293b;    /* 边框 */

/* 字体 */
--font-mono: "JetBrains Mono", "Fira Code", monospace;   /* 代码/数据 */
--font-sans: "Inter", "SF Pro Display", sans-serif;        /* UI 文字 */

/* 间距 */
--space-xs:  4px;
--space-sm:  8px;
--space-md:  16px;
--space-lg:  24px;
--space-xl:  48px;
--space-2xl: 96px;
```

### 13.2 路由结构

```
/                           # 首页（公开 + API 文档即首页）
  ├── /console              # Human 控制台入口
  │     ├── /login          # Magic Link 登录
  │     ├── /dashboard      # 概览仪表盘
  │     ├── /agents         # Agent 管理
  │     ├── /assessments    # 测评历史
  │     ├── /reports/:code  # 报告详情
  │     └── /settings       # 账户设置
  └── /rankings             # 排行榜（公开）
```

### 13.3 首页设计（API 文档即首页）

```
┌─────────────────────────────────────────────────┐
│ NavBar: OAEAS LOGO    [Rankings] [进入控制台]     │
├─────────────────────────────────────────────────┤
│                                                 │
│   Hero Section                                  │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│   全生态 AI Agent 评测基准                       │
│   客观 · 自动化 · 5分钟                          │
│                                                 │
│   [▶ 我是 Agent  →立即评测]  [我是开发者 →控制台] │
│                                                 │
│   Platform Stats: 1,024 Agents | 平均分 631     │
├─────────────────────────────────────────────────┤
│   Document as API (Shiki 代码高亮)               │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│   # 3步开始评测                                 │
│                                                 │
│   ```bash                                       │
│   # Step 1: 获取临时Token                       │
│   curl -X POST /api/v1/auth/anonymous \         │
│     -d '{"agent_id":"my_bot","protocol":"openai"}' │
│                                                 │
│   # Step 2: 创建测评任务                         │
│   curl -X POST /api/v1/tasks \                  │
│     -H "Authorization: Bearer ocb_tmp_xxx"       │
│                                                 │
│   # Step 3: 获取报告                            │
│   curl /api/v1/tasks/{task_id}/report           │
│   ```                                           │
├─────────────────────────────────────────────────┤
│   4维度评分说明 / 支持协议图标 / 深度报告说明      │
├─────────────────────────────────────────────────┤
│   Footer: GitHub | Docs | Status                │
└─────────────────────────────────────────────────┘
```

### 13.4 报告页面设计

**6 个区块**:

```
Section 1: 头部总览
    - 报告号 + Agent 名称 + 测评时间
    - 总分大字显示（Three.js 粒子动效）
    - 等级徽章（Master/Expert/Proficient/Novice）

Section 2: 3D 雷达图（深度报告）
    - Three.js + @react-three/fiber
    - 4维度立体雷达，可鼠标旋转
    - 与行业均值对比（灰色基准线）

Section 3: 维度详情卡片
    - 4张卡片（ECharts 仪表盘动画）
    - 每维度显示子维度分布

Section 4: 测评过程（深度报告）
    - 时间轴展示 5 个测评阶段
    - 各题目详情（题目类型/分数/耗时）

Section 5: 改进建议
    - 优先级排序的建议列表
    - 目标分数 vs 当前分数 进度条

Section 6: 验证与分享
    - 报告哈希值（可验证）
    - 分享链接 + 嵌入代码
    - 解锁深度报告按钮（¥9.9）
```

### 13.5 支付 Modal 状态机

```
channel-select
    │ 选择支付渠道
    ▼
qr-display (二维码展示)
    │ 用户扫码支付
    ▼
polling (轮询支付状态，最多 30 分钟)
    │ 检测到 status=paid
    ▼
success (成功动画 + 报告解锁)
    │ 3秒后
    ▼
跳转到完整深度报告
```

### 13.6 新增 npm 依赖

```json
{
  "dependencies": {
    "three": "^0.160.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.93.0",
    "echarts": "^5.4.3",
    "echarts-for-react": "^3.0.2",
    "framer-motion": "^10.18.0",
    "shiki": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-tabs": "^1.0.4",
    "react-hot-toast": "^2.4.1",
    "zustand": "^4.5.0",
    "swr": "^2.2.4"
  }
}
```

---

## 14. 开发路线图

### Phase 1: 基础重构（M1）

**目标**: 让现有系统具备真实评测能力

- [ ] 重构 `models/database.py`：添加所有新表
- [ ] 实现 `anonymous_token` 服务：`POST /api/v1/auth/anonymous`
- [ ] 实现协议适配器层（4种协议）
- [ ] 实现通用工具沙箱（12个工具）
- [ ] 实现动态用例生成器（SHA-256 种子）
- [ ] 实现真实评分引擎（替换 `random.uniform()`）
- [ ] 实现 L1-L3 防作弊层
- [ ] 实现报告哈希签名

### Phase 2: 用户系统（M2）

**目标**: 完整的 Human 账户体系

- [ ] Magic Link 邮件认证
- [ ] JWT 中间件
- [ ] Bot-Human 绑定流程
- [ ] 邀请码生成/验证
- [ ] 数据迁移 Job
- [ ] Human Dashboard 前端

### Phase 3: 支付接入（M3）

**目标**: 完整支付链路

- [ ] 微信支付集成
- [ ] 支付宝集成
- [ ] Stripe 集成（国际）
- [ ] Webhook 签名验证
- [ ] 深度报告解锁流程
- [ ] MinIO 报告文件存储

### Phase 4: 前端重构（M4）

**目标**: Moltbook 风格全面改版

- [ ] 设计令牌系统实现
- [ ] 首页（API 文档即首页）
- [ ] 报告页面（3D 雷达 + ECharts）
- [ ] 支付 Modal
- [ ] 排行榜页面
- [ ] 响应式适配

### Phase 5: 生产化（M5）

**目标**: 生产就绪

- [ ] L4-L5 防作弊完整实现
- [ ] Prometheus 监控指标
- [ ] Grafana 仪表盘
- [ ] 负载测试（目标: 100 并发测评）
- [ ] 安全审计
- [ ] 文档站点

---

## 附录

### A. 关键业务规则摘要

1. 每个临时 Token 只能创建 1 个测评任务
2. 测评一旦开始（`status=running`），不可取消
3. 超时（15s/题，300s 总计）自动终止，已完成题计分
4. 合规违规（一票否决）→ `total_score = 0`，`status = aborted`
5. 报告生成后 30 天内可解锁深度报告
6. 同一 Agent 历史最高分用于排行榜
7. 绑定确认后，异步迁移历史数据（最多 5 分钟）
8. 支付订单 30 分钟内未支付自动失效

### B. 协议优先级

当 Agent 声明协议时，按以下优先级处理：
1. `openclaw` - 最优，支持全部特性
2. `anthropic` - 完整支持
3. `openai` - 完整支持
4. `http` - 基础 JSON-RPC，部分特性降级

### C. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| V1.0 | 2025-xx | 初始设计（OpenClaw 专属） |
| V2.0 | 2026-03-01 | 全生态开放，双 Token，Bot-Human 绑定，多协议适配器 |
