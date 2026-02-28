# 💳 支付方式调整 - 即时支付方案 (V1.0)

## 用户确认
**Mark**: 不采用充值方式，采用即时支付方式 ✅

---

## 调整后的支付方案

### 核心原则
**纯即时支付，无预充值，无余额管理**

### 支付流程

#### 人类用户支付 (唯一方式)
```
1. Agent完成测评
2. 查看免费版基础报告
3. 点击「解锁深度报告」
4. 生成单次支付订单 (¥9.9)
5. 选择支付方式 (微信/支付宝/Stripe/PayPal)
6. 扫码/跳转完成支付
7. 支付成功立即解锁深度报告
8. 可下载/查看完整报告
```

**特点**:
- ✅ 单次订单，即时支付
- ✅ 无需充值，无余额
- ✅ 财务清晰，每笔独立
- ✅ 技术实现更简单

---

## 与原方案的对比

| 维度 | 原方案 (双轨) | 新方案 (即时支付) |
|------|--------------|------------------|
| **人类支付** | 单次订单 ✅ | 单次订单 ✅ |
| **Agent自主** | 预充值代扣 | ❌ 暂不实现 |
| **余额管理** | 需要 | ❌ 不需要 |
| **技术复杂度** | 中等 | ✅ 简单 |
| **用户体验** | Agent可自主 | 每次需人工支付 |
| **财务清晰度** | 一般 | ✅ 清晰 |

---

## 技术实现调整

### 1. 数据库调整

**删除/简化**:
```sql
-- 删除余额表 (不需要)
-- DROP TABLE user_balances;
-- DROP TABLE balance_transactions;
```

**保留**:
```sql
-- 保留订单表 (核心)
CREATE TABLE payment_orders (
    id UUID PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE,
    user_id UUID REFERENCES users(id),
    task_id UUID REFERENCES assessment_tasks(id),
    report_id UUID REFERENCES reports(id),
    
    -- 支付金额
    amount_cny DECIMAL(10,2) DEFAULT 9.90,
    currency VARCHAR(10) DEFAULT 'CNY',
    
    -- 支付渠道
    channel VARCHAR(20), -- wechat/alipay/stripe/paypal
    channel_order_id VARCHAR(100),
    
    -- 支付状态
    status VARCHAR(20) DEFAULT 'pending', -- pending/paid/failed
    paid_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. 支付流程简化

**原流程 (预充值)**:
```
充值 → 余额管理 → Agent自主扣费 → 余额校验
```

**新流程 (即时支付)**:
```
生成订单 → 用户支付 → 回调确认 → 解锁报告
```

### 3. API调整

**删除**:
- `GET /user/balance` (余额查询)
- 余额相关配置

**保留**:
- `POST /task/{id}/unlock` (创建支付订单)
- 支付回调接口

---

## V1.0 vs V2.0规划

### V1.0 (当前)
**支付方式**: 纯人类即时支付
- 微信扫码支付
- 支付宝扫码支付
- Stripe (境外信用卡)
- PayPal (境外)

**特点**:
- 技术简单，快速上线
- 每笔订单清晰可追溯
- 无需处理余额、充值、退款

### V2.0 (未来)
**考虑增加**:
- Agent自主支付 (预充值或订阅制)
- 企业版对公支付
- 加密货币支付 (USDT)

---

## 优点总结

### 对用户
1. **简单透明**: 每次测评付费，无复杂余额概念
2. **安全**: 无需预存资金，降低信任门槛
3. **灵活**: 按需付费，无绑定

### 对开发
1. **技术简单**: 无需余额系统、充值系统、代扣逻辑
2. **财务清晰**: 每笔订单独立，对账简单
3. **风险低**: 无资金池，无合规风险

---

## 确认实施

**Mark确认采用即时支付方案？**

**确认后立即：**
1. 简化数据库Schema
2. 调整支付流程代码
3. 移除余额相关逻辑

**技术实现更简单，1周内完成支付集成！** 🚀
