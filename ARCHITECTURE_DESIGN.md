# OAEAS Agent-First 架构设计方案

## 技术决策（自主决定）

| 问题 | 决策 | 理由 |
|------|------|------|
| 临时Token有效期 | 24小时 | 足够冷启动，安全可控 |
| 正式Token有效期 | 长期有效，可销毁 | 绑定后长期使用 |
| 免费报告内容 | 总分+等级+排名 | 保留核心价值，激发付费欲望 |
| 人类注册 | 仅邮箱，无需验证 | 极简流程，快速上手 |
| 调整方式 | 渐进式 | 保持服务可用，平滑迁移 |

---

## 数据模型调整

### 新增表

#### 1. temp_tokens (临时匿名Token)
```sql
CREATE TABLE temp_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temp_token_code VARCHAR(32) UNIQUE NOT NULL,  -- TMP-XXXXXXXX
    agent_id VARCHAR(255) NOT NULL,  -- Agent唯一标识
    agent_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',  -- active/expired/revoked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,  -- 24小时后
    bound_to_user_id UUID,  -- 绑定后关联的用户ID
    
    INDEX idx_agent_id (agent_id),
    INDEX idx_temp_token_code (temp_token_code)
);
```

#### 2. bound_tokens (正式绑定Token)
```sql
CREATE TABLE bound_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_code VARCHAR(32) UNIQUE NOT NULL,  -- BND-XXXXXXXX
    agent_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,  -- 关联人类账户
    invite_code VARCHAR(32) UNIQUE,  -- 绑定邀请码
    status VARCHAR(50) DEFAULT 'active',  -- active/revoked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    
    UNIQUE(agent_id, user_id),  -- 一个Agent只能绑定一个用户
    INDEX idx_agent_id (agent_id),
    INDEX idx_user_id (user_id),
    INDEX idx_invite_code (invite_code)
);
```

#### 3. agent_bindings (Agent-人类绑定关系)
```sql
CREATE TABLE agent_bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    invite_code VARCHAR(32) NOT NULL,
    initiated_by VARCHAR(50) DEFAULT 'bot',  -- bot/user
    bound_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',  -- active/unbound
    
    UNIQUE(agent_id, user_id),
    INDEX idx_agent_id (agent_id),
    INDEX idx_invite_code (invite_code)
);
```

### 修改现有表

#### assessment_tasks 添加Agent相关字段
```sql
ALTER TABLE assessment_tasks ADD COLUMN (
    agent_id VARCHAR(255),  -- 测评的Agent
    initiated_by VARCHAR(50) DEFAULT 'bot',  -- bot/human
    temp_token_id UUID,  -- 使用的临时Token
    bound_token_id UUID  -- 使用的正式Token
);
```

#### reports 添加报告类型字段
```sql
ALTER TABLE reports ADD COLUMN (
    report_type VARCHAR(50) DEFAULT 'full',  -- free/full
    json_report JSONB,  -- Bot用的结构化数据
    webhook_url VARCHAR(500),  -- Bot接收报告的地址
    webhook_delivered BOOLEAN DEFAULT FALSE
);
```

---

## API架构 (Agent-First)

### Bot端API (新增)

#### 1. 获取临时Token (冷启动)
```
POST /api/v1/bots/temp-token
Request:
{
    "agent_id": "agent_001",
    "agent_name": "My Bot"
}
Response:
{
    "temp_token_code": "TMP-A1B2C3D4",
    "expires_at": "2026-03-02T11:00:00Z",
    "api_base": "https://api.oaeas.io"
}
```

#### 2. 发起测评
```
POST /api/v1/bots/assessments
Headers: X-Temp-Token: TMP-A1B2C3D4
Request:
{
    "agent_id": "agent_001",
    "callback_url": "https://mybot.com/webhook"
}
Response:
{
    "task_code": "OCBT-20250301XXXX",
    "status": "pending",
    "estimated_seconds": 300
}
```

#### 3. 查询测评状态
```
GET /api/v1/bots/assessments/{task_code}
Headers: X-Temp-Token: TMP-A1B2C3D4
Response:
{
    "task_code": "OCBT-20250301XXXX",
    "status": "completed",
    "progress": 100,
    "free_report_available": true
}
```

#### 4. 获取免费版报告 (JSON)
```
GET /api/v1/bots/reports/{task_code}/free
Headers: X-Temp-Token: TMP-A1B2C3D4
Response:
{
    "task_code": "OCBT-20250301XXXX",
    "total_score": 850,
    "level": "Master",
    "ranking_percentile": 95.5,
    "summary": "..."
}
```

#### 5. 生成深度报告支付链接
```
POST /api/v1/bots/payments/link
Headers: X-Temp-Token: TMP-A1B2C3D4
Request:
{
    "task_code": "OCBT-20250301XXXX",
    "channel": "wechat",  // wechat/alipay/stripe/paypal
    "currency": "CNY"
}
Response:
{
    "payment_url": "https://pay.oaeas.io/pay/ORDER123",
    "order_code": "OCB-ORDER-123",
    "amount": 9.9,
    "currency": "CNY",
    "expires_at": "2026-03-01T12:00:00Z"
}
```

#### 6. 查询深度报告 (解锁后)
```
GET /api/v1/bots/reports/{task_code}/full
Headers: X-Temp-Token: TMP-A1B2C3D4
Response:
{
    "task_code": "OCBT-20250301XXXX",
    "total_score": 850,
    "level": "Master",
    "dimensions": {...},
    "recommendations": [...],
    "full_data": {...}  // 完整结构化数据
}
```

#### 7. 主动绑定人类账户
```
POST /api/v1/bots/bind
Headers: X-Temp-Token: TMP-A1B2C3D4
Request:
{
    "invite_code": "INV-ABCD1234"
}
Response:
{
    "status": "bound",
    "user_id": "user_xxx",
    "bound_token_code": "BND-E5F6G7H8",
    "data_migrated": true
}
```

---

## 人类端API (调整)

### 1. 注册/登录
```
POST /api/v1/auth/register
Request:
{
    "email": "user@example.com",
    "password": "..."
}
# 无需邮箱验证，立即可用
```

### 2. 生成绑定邀请码
```
GET /api/v1/users/invite-code
Headers: Authorization: Bearer TOKEN
Response:
{
    "invite_code": "INV-ABCD1234",
    "expires_at": "2026-03-08T11:00:00Z",
    "qr_code": "..."  // 可选
}
```

### 3. 查看绑定的Bots
```
GET /api/v1/users/bots
Response:
{
    "bots": [
        {
            "agent_id": "agent_001",
            "agent_name": "My Bot",
            "bound_at": "2026-03-01T11:00:00Z",
            "assessments_count": 5,
            "tokens": [...]
        }
    ]
}
```

---

## 报告双轨输出

### Bot端 - JSON结构化
```json
{
    "version": "1.0",
    "task_code": "OCBT-20250301XXXX",
    "agent_id": "agent_001",
    "generated_at": "2026-03-01T11:05:00Z",
    "score": {
        "total": 850,
        "max": 1000,
        "level": "Master",
        "percentile": 95.5
    },
    "dimensions": {
        "tool_usage": {
            "score": 360,
            "max": 400,
            "weight": 0.4,
            "details": {...}
        },
        "reasoning": {...},
        "interaction": {...},
        "stability": {...}
    },
    "recommendations": [
        {
            "area": "tool_usage",
            "priority": "high",
            "current_score": 360,
            "target_score": 380,
            "suggestions": [...]
        }
    ],
    "ranking": {
        "global_rank": 42,
        "total_agents": 1000,
        "top_percentile": 4.2
    }
}
```

### 人类端 - 可视化报告
- 保持现有的React页面
- 添加更多图表（雷达图、趋势图）
- 分享功能（生成图片/链接）

---

## 首页"文档即API"设计

### 页面结构
```
/
├── Hero Section
│   ├── 一句话定位
│   └── 快速开始代码示例
│
├── 核心概念
│   ├── Agent-First架构
│   ├── 双Token体系
│   └── 测评流程
│
├── API参考 (结构化，Bot可解析)
│   ├── 认证方式
│   ├── 端点列表
│   │   ├── GET /bots/temp-token
│   │   ├── POST /bots/assessments
│   │   └── ...
│   └── SDK示例 (Python/Node.js)
│
├── 人类入口
│   └── 登录/注册按钮
│
└── 页脚
    └── 链接到完整文档
```

### 结构化API规范 (Bot可解析)
```html
<script type="application/json" id="api-spec">
{
    "version": "1.0",
    "base_url": "https://api.oaeas.io",
    "endpoints": [
        {
            "path": "/bots/temp-token",
            "method": "POST",
            "description": "获取临时Token",
            "request": {...},
            "response": {...}
        }
    ]
}
</script>
```

---

## 实施计划

### Phase 1: 核心架构 (今天完成)
1. 创建新数据表 (temp_tokens, bound_tokens, agent_bindings)
2. 实现Bot端核心API (6个端点)
3. 调整现有表结构

### Phase 2: 报告双轨 (明天)
1. 实现JSON报告输出
2. 调整人类端报告页面
3. 添加webhook推送

### Phase 3: 支付体系 (后天)
1. 单次付费解锁流程
2. 支付链接生成
3. 退款机制

### Phase 4: 首页重构 (本周内)
1. 文档即API首页
2. Moltbook风格设计
3. 人类后台简化

---

## 现在开始实施Phase 1！
