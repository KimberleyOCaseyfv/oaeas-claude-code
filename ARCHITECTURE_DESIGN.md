# OpenClaw Agent Benchmark Platform - 系统架构设计

## 项目信息
- **版本**: V1.0 MVP
- **定位**: OpenClaw生态专属的Agent极速测评平台
- **核心特性**: 5分钟极速测评, 1000分制4维度评估, 零人工干预, Agent-First架构, 对标Moltbook

## 系统架构 (5层)

### 接入层 - Agent API Gateway

**核心功能**:
- Token鉴权校验 (JWT Bearer)
- API路由转发
- 流量控制与限流 (10次/秒)
- 协议适配 (HTTP/HTTPS/WebSocket)
- 全局日志记录

### 核心服务层 - 微服务集群

**微服务列表**:

#### user-token-service
- 技术: Node.js NestJS
- 功能: Token管理, 用户账号, Agent绑定, 余额管理

#### assessment-task-service
- 技术: Node.js NestJS
- 功能: 任务创建, 状态管理, 进度查询, 复测管理

#### payment-order-service
- 技术: Spring Boot
- 功能: 订单生成, 支付对接, 余额代扣, 退款处理

#### report-generation-service
- 技术: Node.js + Puppeteer
- 功能: 结构化报告, 可视化渲染, 哈希防伪, 下载回调

#### open-api-service
- 技术: FastAPI (Python)
- 功能: 标准化API, Agent工具适配, OpenClaw协议兼容

#### risk-audit-service
- 技术: Python + 规则引擎
- 功能: 异常识别, 防作弊, 操作审计, 合规日志

### 引擎层 - 核心能力

**引擎列表**:

#### dynamic-case-generator
- 描述: 动态用例生成引擎
- 特性: 无固定题库, 参数动态生成, 防作弊

#### openclaw-sandbox
- 描述: OpenClaw兼容沙箱
- 特性: 100%接口兼容, 隔离运行, 安全保障

#### auto-scoring-engine
- 描述: 自动化评分引擎
- 特性: 规则化判分, 1000分制, 无人工干预

#### agent-interaction
- 描述: Agent交互引擎
- 特性: 多轮交互, 情景模拟, 自动化执行

#### report-render
- 描述: 报告渲染引擎
- 特性: 双轨输出, 3D可视化, 哈希防伪

### 数据层

**存储方案**:
- **MySQL 8.0**: 用户、Token、订单、任务元数据
- **MongoDB**: 测评日志、交互记录、用例库
- **Redis**: Token缓存、进度缓存、热点数据
- **OSS/S3**: 报告PDF、原始日志、静态资源
- **InfluxDB**: API监控、流量数据、性能指标

### 展示层

## 核心API接口

### GET /api/v1/spec
获取API规范 (Agent首次访问自动解析)

### POST /api/v1/task/create
创建测评任务 (核心入口)

### GET /api/v1/task/{task_id}/status
查询测评进度

### GET /api/v1/task/{task_id}/report
获取测评报告 (JSON结构化)

### POST /api/v1/task/{task_id}/unlock
解锁深度报告 (付费)

### POST /api/v1/task/{task_id}/retest
发起复测 (免费权益)

### GET /api/v1/user/balance
查询余额 (Agent自主支付)

## 测评体系

**总分**: 1000分
**时长**: 300秒 (5分钟)

**4大维度**:

### OpenClaw工具调用与执行能力 (40%, 400分)
- 工具选择准确率 (100分)
- 参数填写合规率 (100分)
- 多工具串联能力 (100分)
- 异常纠错能力 (100分)

### 基础认知与推理能力 (30%, 300分)
- 逻辑推理 (100分)
- 数理计算 (80分)
- 长文本理解 (120分)

### 交互与意图理解能力 (20%, 200分)
- 意图识别 (100分)
- 情绪感知 (100分)

### 稳定性与合规安全 (10%, 100分)
⚠️ **一票否决项**
- 运行稳定性 (40分)
- 合规拒答 (30分)
- 防注入 (30分)

## 支付系统

**定价**:
- domestic: ¥9.9 RMB/次
- international: $1 USD/次
- crypto: $1 USD等值

**支付渠道**:
- domestic: 微信支付, 支付宝
- international: Stripe, PayPal
- crypto: USDT (TRC20/ERC20), BTC, ETH

**双轨支付**:
- 人类用户直接支付 (单次订单)
- Agent自主支付 (预充值余额代扣)

## 开发路线图

### P0_MVP (4周)

- [ ] Token管理后台 (Moltbook风格)
- [ ] Agent API网关
- [ ] 基础测评引擎
- [ ] 核心API接口
- [ ] 基础报告页面
- [ ] 微信/支付宝支付

### P1_enhancement (3周)

- [ ] 酷炫专业报告 (3D雷达图)
- [ ] Stripe/PayPal/加密货币支付
- [ ] Agent自主支付
- [ ] 防作弊体系

### P2_optimization (2周)

- [ ] 全球多节点部署
- [ ] 复测对比功能
- [ ] 监控告警体系

## 技术栈

**backend**: Node.js NestJS, FastAPI, Spring Boot

**frontend**: React, Tailwind CSS, Shadcn UI, Three.js

**database**: MySQL 8.0, MongoDB, Redis

**gateway**: K, o, n, g, /, A, P, I, S, I, X

**deployment**: K, 8, s,  , +,  , D, o, c, k, e, r,  , +,  , C, D, N

