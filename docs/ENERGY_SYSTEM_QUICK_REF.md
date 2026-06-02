# ⚡ 能量系统快速参考

## 🎯 核心概念

### AI能量值
- **范围**: 0-100
- **初始值**: 100
- **恢复**: 5点/小时
- **消耗**: 2点/消息 + Token消耗

### 用户Token限制
- **软限制**: 50,000 tokens/天
- **硬限制**: 100,000 tokens/天
- **重置**: 每天午夜

## 📊 阈值速查

| 指标 | 值 | 效果 |
|------|-----|------|
| 低能量警告 | ≤30 | 显示疲劳提示，AI仍响应 |
| 临界疲劳 | ≤10 | AI拒绝响应 |
| Token软限制 | 50,000 | AI响应变简短 |
| Token硬限制 | 100,000 | AI响应非常简短 |

## 🎁 充能方式

| 方式 | 恢复量 | 触发 |
|------|--------|------|
| 自动恢复 | 5/小时 | 时间流逝 |
| 礼物 | +15 | 用户赠送礼物 |
| 爱心 | +5 | 用户发送爱心 |

## 🐾 物种能量修正

| 类型 | 物种示例 | 消耗修正 |
|------|----------|----------|
| 高能量 | 狗、兔子、狐狸 | -20% |
| 普通 | 大多数物种 | 0% |
| 低能量 | 猫、考拉、猫头鹰 | +20% |

## 💬 系统消息

### 能量相关
```
😮‍💨 [AI名字] is getting tired... Consider sending a gift or heart!
😴 [AI名字] is extremely exhausted... Send a gift 🎁 or love ❤️!
💝 [AI名字] feels energized by your gift! (+15 energy)
```

### Token相关
```
⚠️ You're approaching your daily chat limit. AI responses may become shorter.
⚠️ You've reached your daily chat limit. Limit resets tomorrow!
```

## 🔧 配置位置

所有配置在: `lib/energy-manager.ts`

```typescript
export const ENERGY_CONFIG = {
    MAX_ENERGY: 100,
    ENERGY_COST_PER_MESSAGE: 2,
    LOW_ENERGY_THRESHOLD: 30,
    CRITICAL_ENERGY_THRESHOLD: 10,
    ENERGY_REGEN_PER_HOUR: 5,
    GIFT_ENERGY_RESTORE: 15,
    HEART_ENERGY_RESTORE: 5,
    DAILY_TOKEN_SOFT_LIMIT: 50000,
    DAILY_TOKEN_HARD_LIMIT: 100000,
};
```

## 🛠️ 调试技巧

### 查看AI能量
```javascript
console.log(contacts.map(c => ({ 
    name: c.name, 
    energy: c.energy 
})));
```

### 查看Token使用
```javascript
console.log({
    daily: user.dailyTokensUsed,
    total: user.totalTokensUsed
});
```

### 模拟低能量
```javascript
contacts[0].energy = 5;
```

### 模拟高Token使用
```javascript
setUser(prev => ({ ...prev, dailyTokensUsed: 50000 }));
```

## 📁 关键文件

| 文件 | 作用 |
|------|------|
| `lib/energy-manager.ts` | 核心逻辑 |
| `lib/gemini-server.ts` | AI响应生成 |
| `App.tsx` | 集成实现 |
| `types.ts` | 类型定义 |
| `components/EnergyDebugPanel.tsx` | 调试工具 |

## 🚨 常见问题

### Q: 能量值不更新？
A: 检查 `initializeEnergy()` 是否在加载contacts时调用

### Q: Token追踪不准确？
A: 正常，使用估算值（字符数/4）

### Q: 每日重置不工作？
A: 检查 `lastTokenReset` 字段和定时器

### Q: AI总是疲劳？
A: 检查能量恢复逻辑，确保 `lastEnergyUpdate` 正确

## 📞 获取帮助

1. 查看完整文档: `docs/ENERGY_SYSTEM.md`
2. 运行测试: `docs/ENERGY_SYSTEM_TESTING.md`
3. 使用调试面板: `EnergyDebugPanel`

---

**快速参考版本**: 1.0  
**最后更新**: 2026-01-09
