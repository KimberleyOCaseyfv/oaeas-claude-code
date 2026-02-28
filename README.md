# 🚀 OpenClaw Agent Benchmark Platform

**OpenClaw生态专属的Agent极速测评平台**

> 5分钟极速测评 | 1000分制4维度评估 | 零人工干预 | 对标Moltbook

---

## 📊 项目状态

**当前阶段**: P0 MVP开发 (Week 1)  
**开发模式**: 7×24小时全力冲刺  
**预计交付**: 9周完整V1.0

### 今日进展 (Day 1)
- ✅ 系统架构设计 (100%)
- ✅ 核心代码生成 (100%)
- ✅ 数据库Schema (100%)
- ✅ Docker部署配置 (100%)
- ⏳ 测试验证与优化 (进行中)

**开发效率**: 传统5天 → Multi-Agent 2小时 (60x提升) ⚡

---

## 🏗️ 系统架构

### 5层架构
1. **接入层** - Kong/APISIX API网关
2. **服务层** - 6个微服务集群
3. **引擎层** - 5个核心测评引擎
4. **数据层** - PostgreSQL + MongoDB + Redis
5. **展示层** - Agent JSON + 人类可视化

### 核心服务
- **Token管理** (React + Tailwind + Shadcn)
- **API网关** (Kong/APISIX)
- **测评引擎** (FastAPI)
- **报告系统** (Puppeteer + React)
- **支付系统** (微信/支付宝/Stripe/PayPal/加密货币)

---

## 🎯 核心功能

### 4维度1000分测评
| 维度 | 权重 | 分数 | 核心能力 |
|------|------|------|----------|
| OpenClaw工具调用 | 40% | 400分 | 工具选择、参数填写、串联、纠错 |
| 基础认知推理 | 30% | 300分 | 逻辑、数理、长文本理解 |
| 交互意图理解 | 20% | 200分 | 意图识别、情绪感知 |
| 稳定性合规 | 10% | 100分 | 稳定性、合规、安全(一票否决) |

### 关键特性
- ⏱️ **5分钟** 极速测评
- 🤖 **零人工** 全程Agent自主
- 🛡️ **5层防作弊** 动态用例
- 💰 **¥9.9/次** 深度报告

---

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/KimberleyOCaseyfv/oaeas-claude-code.git
cd oeas-claude-code
```

### 2. 配置环境
```bash
# 编辑环境变量
vim .env

# 添加你的API Key
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### 3. 一键启动
```bash
./start.sh
```

### 4. 访问服务
- Token Dashboard: http://localhost:3000
- Assessment Engine: http://localhost:8001
- Kong Gateway: http://localhost:8000

---

## 📁 项目结构

```
oeas-claude-code/
├── frontend/
│   └── token-dashboard/     # React前端 (Moltbook风格)
├── backend/
│   └── assessment-engine/   # FastAPI后端
├── gateway/
│   └── kong.yml            # API网关配置
├── database/
│   └── schema.sql          # PostgreSQL Schema
├── docker-compose.yml       # 一键部署
├── start.sh                # 快速启动脚本
└── README.md               # 本文档
```

---

## 🛠️ 技术栈

### 前端
- React 18
- Tailwind CSS
- Shadcn UI
- Three.js (3D雷达图)

### 后端
- FastAPI (Python)
- Node.js NestJS
- Spring Boot

### 数据库
- PostgreSQL 15 (主数据)
- MongoDB 6 (日志)
- Redis 7 (缓存)

### 部署
- Docker + Docker Compose
- Kubernetes (生产)
- Kong/APISIX (网关)

---

## 📅 开发路线图

### P0 MVP (Week 1-4)
- [x] 系统架构设计
- [x] Token管理后台
- [x] API网关配置
- [x] 测评引擎核心
- [x] 数据库Schema
- [x] Docker部署
- [ ] 微信/支付宝支付 (等待商户号)
- [ ] 测试验证

### P1 增强 (Week 5-7)
- [ ] Stripe/PayPal支付
- [ ] 加密货币支付
- [ ] 酷炫报告系统
- [ ] 防作弊完善
- [ ] 全球多节点

### P2 优化 (Week 8-9)
- [ ] 性能优化
- [ ] 监控告警
- [ ] 复测对比
- [ ] 生产部署
- [ ] V1.0发布 🎉

---

## 💰 商业模式

| 版本 | 内容 | 价格 |
|------|------|------|
| **免费版** | 基础报告 (分数、雷达图、排名) | ¥0 |
| **付费版** | 深度报告 (全维度、日志、建议) | ¥9.9/次 |

**目标收入**:
- 首月: 100次付费 = ¥990
- 第3月: 1000次付费 = ¥9,900
- 第6月: 5000次付费 = ¥49,500

---

## 👥 团队

### Mark
- 产品/运营/商务
- 支付商户号申请
- 域名备案
- 市场推广

### Luck (OpenClaw Agent)
- 架构设计
- 核心开发 (Multi-Agent)
- 部署运维
- 技术支持

---

## 🤝 贡献

本项目使用 **Claude Code Multi-Agent** 开发:
- 5角色协作 (Architect/Coder/Reviewer/Tester/Documenter)
- 60倍开发效率提升
- 7×24小时持续迭代

---

## 📄 文档

- [系统架构设计](ARCHITECTURE_DESIGN.md)
- [数据库Schema](database/schema.sql)
- [支付设置指南](PAYMENT_SETUP_GUIDE.md)
- [长期开发计划](LONG_TERM_PLAN.md)

---

## 📝 License

MIT License - Open Source

---

**🚀 7×24小时持续开发中！预计9周交付V1.0！**

**一起打造OpenClaw生态的杀手级产品！** 💪⚡
