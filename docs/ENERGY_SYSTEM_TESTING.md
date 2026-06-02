# 能量系统测试清单

## 🧪 功能测试

### 1. AI能量值初始化测试
- [ ] 打开应用，查看浏览器控制台
- [ ] 检查所有AI contacts是否有 `energy: 100`
- [ ] 检查 `maxEnergy: 100`
- [ ] 检查 `lastEnergyUpdate` 有时间戳

**测试方法**:
```javascript
// 在浏览器控制台运行
console.log(contacts.map(c => ({ 
    name: c.name, 
    energy: c.energy, 
    maxEnergy: c.maxEnergy 
})));
```

### 2. 能量消耗测试
- [ ] 与AI聊天发送一条消息
- [ ] 检查AI的能量值是否减少（约2-5点）
- [ ] 发送多条消息，观察能量持续下降

**预期结果**:
- 每条消息消耗 2 + (tokens/1000) 点能量
- 高能量物种（狗、兔子）消耗更少
- 低能量物种（猫、考拉）消耗更多

### 3. 能量恢复测试
- [ ] 等待1小时后再次打开聊天
- [ ] 检查能量是否恢复（+5点/小时）
- [ ] 或者修改 `lastEnergyUpdate` 时间戳来模拟

**模拟测试**:
```javascript
// 在浏览器控制台
// 模拟2小时前的更新
const contact = contacts[0];
contact.lastEnergyUpdate = Date.now() - (2 * 60 * 60 * 1000);
// 重新打开聊天，应该恢复10点能量
```

### 4. 疲劳提示测试

#### 低能量警告 (30点)
- [ ] 将AI能量降至30点以下
- [ ] 发送消息
- [ ] 应该看到: "😮‍💨 [AI名字] is getting tired..."
- [ ] AI仍然会响应

#### 临界疲劳 (10点)
- [ ] 将AI能量降至10点以下
- [ ] 发送消息
- [ ] 应该看到: "😴 [AI名字] is extremely exhausted..."
- [ ] AI拒绝响应: "*[AI名字] is too exhausted to respond... 😴💤*"

**模拟测试**:
```javascript
// 设置低能量
contacts[0].energy = 25;

// 设置临界能量
contacts[0].energy = 5;
```

### 5. 礼物充能测试
- [ ] 在聊天界面发送礼物给AI
- [ ] 检查能量是否增加15点
- [ ] 应该看到系统消息: "💝 [AI名字] feels energized by your gift! (+15 energy)"

### 6. 爱心充能测试
- [ ] 发送爱心给AI
- [ ] 检查能量是否增加5点
- [ ] 应该看到充能提示

### 7. Token追踪测试
- [ ] 查看用户profile
- [ ] 检查 `totalTokensUsed` 初始为0
- [ ] 检查 `dailyTokensUsed` 初始为0
- [ ] 发送消息后，两个值都应该增加

**检查方法**:
```javascript
console.log({
    total: user.totalTokensUsed,
    daily: user.dailyTokensUsed,
    lastReset: user.lastTokenReset
});
```

### 8. Token警告测试

#### 软限制警告 (50,000 tokens)
- [ ] 模拟 `dailyTokensUsed = 50000`
- [ ] 发送消息
- [ ] 应该看到: "⚠️ You're approaching your daily chat limit..."

#### 硬限制警告 (100,000 tokens)
- [ ] 模拟 `dailyTokensUsed = 100000`
- [ ] 发送消息
- [ ] 应该看到: "⚠️ You've reached your daily chat limit..."

**模拟测试**:
```javascript
// 在App.tsx中临时修改
setUser(prev => ({ ...prev, dailyTokensUsed: 50000 }));
setUser(prev => ({ ...prev, dailyTokensUsed: 100000 }));
```

### 9. 响应长度调整测试
- [ ] 正常状态下，AI响应应该详细
- [ ] 设置 `dailyTokensUsed = 50000`
- [ ] AI响应应该变得适中
- [ ] 设置 `dailyTokensUsed = 100000`
- [ ] AI响应应该非常简短

### 10. 每日重置测试
- [ ] 设置 `lastTokenReset` 为昨天
- [ ] 等待或刷新页面
- [ ] `dailyTokensUsed` 应该重置为0
- [ ] `lastTokenReset` 应该更新为今天

**模拟测试**:
```javascript
// 设置为昨天
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
setUser(prev => ({ 
    ...prev, 
    lastTokenReset: yesterday.toISOString(),
    dailyTokensUsed: 50000 
}));
// 刷新页面，应该重置
```

## 🗄️ 数据库测试

### 1. 迁移测试
- [ ] 在Supabase SQL编辑器运行 `migrations/add_token_tracking.sql`
- [ ] 检查 `profiles` 表是否有新字段:
  - `total_tokens_used`
  - `daily_tokens_used`
  - `last_token_reset`

### 2. 数据持久化测试
- [ ] 发送消息，消耗Token
- [ ] 刷新页面
- [ ] Token使用量应该保持不变（已持久化）

### 3. 同步测试
- [ ] 在一个标签页发送消息
- [ ] 在另一个标签页刷新
- [ ] Token使用量应该同步

## 🎨 UI/UX测试

### 1. 系统消息显示
- [ ] 疲劳提示应该清晰可见
- [ ] Token警告应该醒目
- [ ] 充能成功消息应该有正面反馈

### 2. 用户体验流畅性
- [ ] 能量消耗不应该影响聊天速度
- [ ] 警告不应该过于频繁
- [ ] 疲劳提示应该温和而不是突兀

### 3. 礼物/爱心交互
- [ ] 发送礼物应该有即时反馈
- [ ] 能量恢复应该立即可见
- [ ] 应该鼓励玩家使用充能功能

## 🐛 调试工具测试

### 1. EnergyDebugPanel
- [ ] 添加调试按钮（仅管理员）
- [ ] 打开调试面板
- [ ] 检查所有AI的能量状态
- [ ] 检查用户Token使用情况
- [ ] 检查系统配置显示

### 2. 控制台日志
- [ ] 能量消耗应该有日志
- [ ] Token追踪应该有日志
- [ ] 每日重置应该有日志

## 📊 性能测试

### 1. 能量计算性能
- [ ] 打开包含多个AI的聊天列表
- [ ] 应该没有明显延迟
- [ ] 能量恢复计算应该快速

### 2. 数据库写入频率
- [ ] 检查每条消息是否只写入一次
- [ ] Token更新不应该过于频繁
- [ ] 每日重置不应该重复执行

## 🔒 边界情况测试

### 1. 能量边界
- [ ] 能量不应该低于0
- [ ] 能量不应该超过maxEnergy
- [ ] 负数Token不应该出现

### 2. 时间边界
- [ ] 跨午夜测试每日重置
- [ ] 长时间不活跃后的能量恢复
- [ ] 时区变化的影响

### 3. 并发测试
- [ ] 同时与多个AI聊天
- [ ] 每个AI的能量应该独立计算
- [ ] Token总量应该正确累加

## ✅ 验收标准

所有测试通过后，系统应该满足：

1. **功能完整性**
   - ✅ 所有6个核心功能正常工作
   - ✅ 无JavaScript错误
   - ✅ 数据正确持久化

2. **用户体验**
   - ✅ 提示清晰友好
   - ✅ 交互流畅自然
   - ✅ 不影响正常使用

3. **成本控制**
   - ✅ Token消耗在预期范围内
   - ✅ 高频用户被有效限制
   - ✅ 每日重置正常工作

4. **可维护性**
   - ✅ 代码清晰易懂
   - ✅ 配置集中管理
   - ✅ 文档完整准确

---

**测试负责人**: _________  
**测试日期**: _________  
**测试环境**: _________  
**测试结果**: ⬜ 通过 / ⬜ 失败  
**备注**: _________
