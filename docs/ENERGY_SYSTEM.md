# 能量系统完整实现文档

## 📋 系统概述

ToonTalk的能量系统是一个多层次的API使用控制机制，旨在防止用户过度消耗Gemini API额度，同时提供良好的用户体验。

## 🎯 核心功能

### 1. AI成员能量值系统

每个AI成员都有独立的能量值，用于限制单个AI的聊天频率。

#### 能量值属性
- **energy**: 当前能量值 (0-100)
- **maxEnergy**: 最大能量值 (默认100)
- **lastEnergyUpdate**: 上次能量更新时间戳

#### 能量消耗规则
- **基础消耗**: 每条消息消耗2点能量
- **Token消耗**: 每1000 tokens额外消耗1点能量
- **个性修正**: 不同物种有不同的能量消耗率
  - 高能量物种 (狗、兔子等): 消耗减少20%
  - 低能量物种 (猫、考拉等): 消耗增加20%
  - 普通物种: 正常消耗

#### 能量恢复机制
- **自动恢复**: 每小时恢复5点能量
- **礼物充能**: 赠送礼物恢复15点能量
- **爱心充能**: 发送爱心恢复5点能量

#### 疲劳提示
- **低能量阈值 (30点)**: 
  - 提示: "😮‍💨 [AI名字] is getting tired..."
  - AI仍可正常响应
  
- **临界阈值 (10点)**:
  - 提示: "😴 [AI名字] is extremely exhausted..."
  - AI拒绝响应，显示: "*[AI名字] is too exhausted to respond... 😴💤*"

### 2. 用户Token消耗追踪

追踪用户的总体API使用量，防止单个用户过度消耗。

#### 追踪字段
- **totalTokensUsed**: 用户累计消耗的总token数
- **dailyTokensUsed**: 当日消耗的token数
- **lastTokenReset**: 上次每日重置的时间

#### 每日重置
- 每天午夜自动重置 `dailyTokensUsed` 为0
- 应用启动时检查并重置
- 每小时检查一次是否需要重置

### 3. 聊天积极性调整

根据用户的token使用量动态调整AI的响应长度和积极性。

#### 阈值设置
- **软限制**: 50,000 tokens/天
  - 开始降低AI响应积极性
  - AI响应变得更简短
  
- **硬限制**: 100,000 tokens/天
  - 显著降低AI响应长度
  - 最低保持50%的积极性

#### 积极性计算
```typescript
if (dailyTokens < 50,000) {
    enthusiasm = 1.0  // 100% 积极性
} else if (dailyTokens < 100,000) {
    enthusiasm = 1.0 - ((dailyTokens - 50,000) / 50,000) * 0.5  // 渐进降低
} else {
    enthusiasm = 0.5  // 50% 积极性
}
```

#### 响应长度修正
- **高积极性 (≥90%)**: "Be enthusiastic and detailed in your response."
- **中等积极性 (70-90%)**: "Keep your response moderate in length."
- **低积极性 (<70%)**: "Keep your response brief and concise."

### 4. 用户提示系统

#### Token使用警告
- **接近限制 (50,000-100,000 tokens)**:
  ```
  ⚠️ You're approaching your daily chat limit. AI responses may become shorter.
  ```

- **达到限制 (≥100,000 tokens)**:
  ```
  ⚠️ You've reached your daily chat limit. AI responses will be brief. Limit resets tomorrow!
  ```

## 🔧 技术实现

### 文件结构
```
lib/
  ├── energy-manager.ts          # 能量管理核心逻辑
  └── gemini-server.ts           # AI响应生成（支持长度修正）

App.tsx                          # 主应用逻辑
  ├── 能量消耗处理
  ├── Token追踪
  └── 每日重置

types.ts                         # 类型定义
  ├── Contact (能量属性)
  └── UserProfile (Token追踪)

migrations/
  └── add_token_tracking.sql     # 数据库迁移
```

### 关键函数

#### energy-manager.ts
- `initializeEnergy()`: 初始化AI能量值
- `regenerateEnergy()`: 基于时间恢复能量
- `consumeEnergyWithPersonality()`: 消耗能量（带个性修正）
- `restoreEnergy()`: 通过礼物/爱心恢复能量
- `getFatigueMessage()`: 获取疲劳提示
- `calculateEnthusiasm()`: 计算AI积极性
- `getResponseLengthModifier()`: 获取响应长度修正指令
- `resetDailyTokensIfNeeded()`: 检查并重置每日token

#### App.tsx
- `handleUserSendMessage()`: 处理用户消息，消耗能量和token
- `updateUserData()`: 更新用户数据并同步到数据库
- Daily Token Reset Effect: 自动每日重置

## 📊 数据流程

### 用户发送消息时
```
1. 检查AI能量值
   ├─ 能量 ≤ 10: 拒绝响应
   ├─ 能量 ≤ 30: 显示疲劳警告
   └─ 能量 > 30: 正常处理

2. 计算用户积极性
   └─ 基于 dailyTokensUsed

3. 生成AI响应
   └─ 传递长度修正参数

4. 估算Token消耗
   └─ (用户消息长度 + AI响应长度) / 4

5. 更新状态
   ├─ AI能量值 -= (基础消耗 + Token消耗) * 个性修正
   ├─ 用户 totalTokensUsed += 估算Token
   └─ 用户 dailyTokensUsed += 估算Token

6. 同步到数据库
```

### 能量恢复流程
```
自动恢复:
  每次访问AI时检查时间差
  └─ 恢复 = (小时数 * 5) 点能量

礼物/爱心:
  用户主动触发
  ├─ 礼物: +15 能量
  └─ 爱心: +5 能量
```

## 🎮 用户体验设计

### 正常状态
- AI响应快速、详细
- 无任何限制提示

### 接近限制
- 显示温和警告
- AI响应略微简短
- 鼓励明天再来

### 达到限制
- 显示明确警告
- AI响应非常简短
- 说明重置时间

### AI疲劳
- 显示可爱的疲劳表情
- 提示玩家送礼物
- 营造情感连接

## 🔐 安全考虑

1. **前端不显示能量值**: 防止用户刻意规避限制
2. **后台Token估算**: 虽然不精确，但足够防止滥用
3. **多层限制**: AI能量 + 用户Token双重保护
4. **渐进式降级**: 不是突然禁止，而是逐步降低服务质量

## 📈 配置参数

所有配置集中在 `energy-manager.ts` 的 `ENERGY_CONFIG`:

```typescript
ENERGY_CONFIG = {
    MAX_ENERGY: 100,                    // AI最大能量
    INITIAL_ENERGY: 100,                // AI初始能量
    ENERGY_COST_PER_MESSAGE: 2,         // 每条消息基础消耗
    LOW_ENERGY_THRESHOLD: 30,           // 低能量警告阈值
    CRITICAL_ENERGY_THRESHOLD: 10,      // 临界能量阈值
    ENERGY_REGEN_PER_HOUR: 5,           // 每小时恢复量
    GIFT_ENERGY_RESTORE: 15,            // 礼物恢复量
    HEART_ENERGY_RESTORE: 5,            // 爱心恢复量
    DAILY_TOKEN_SOFT_LIMIT: 50000,      // Token软限制
    DAILY_TOKEN_HARD_LIMIT: 100000,     // Token硬限制
}
```

## 🚀 部署清单

### 数据库迁移
```bash
# 在Supabase SQL编辑器中运行
migrations/add_token_tracking.sql
```

### 环境变量
无需额外配置，使用现有的 `GEMINI_API_KEY`

### 测试要点
- [ ] AI能量值正确初始化
- [ ] 能量消耗正确计算（含个性修正）
- [ ] 能量自动恢复工作正常
- [ ] 礼物/爱心充能功能正常
- [ ] 疲劳提示正确显示
- [ ] Token追踪准确
- [ ] 每日重置正常工作
- [ ] 积极性调整生效
- [ ] 数据库同步正常

## 🎯 未来优化方向

1. **精确Token计数**: 使用Gemini API返回的实际token数
2. **订阅用户特权**: Premium用户更高的token限制
3. **能量可视化**: 为管理员提供能量监控面板
4. **动态调整**: 根据API成本自动调整阈值
5. **能量交易**: 允许玩家之间转移能量
6. **成就系统**: 奖励节约使用的玩家

## 📝 维护注意事项

1. **监控API使用**: 定期检查实际API消耗是否在预期范围内
2. **调整阈值**: 根据实际使用情况调整 `ENERGY_CONFIG`
3. **用户反馈**: 收集用户对限制的感受，平衡体验和成本
4. **数据清理**: 定期清理过期的token追踪数据

---

**版本**: 1.0  
**最后更新**: 2026-01-09  
**作者**: Antigravity AI Assistant
