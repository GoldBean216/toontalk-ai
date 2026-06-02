<div align="center">
<img width="1200" height="475" alt="ToonTalk AI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# ToonTalk AI - 奇妙卡通世界

[English Version (README_EN.md)](README_EN.md) | **简体中文**

[![Next.js Version](https://img.shields.io/badge/Next.js-14.2.3-black.svg?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![React Version](https://img.shields.io/badge/React-18.3.1-blue.svg?style=flat-square&logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.3-38bdf8.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](#)

一个精心打造的、具有精美卡通风格的虚拟社交与模拟互动世界。在这里，您不与任何人类聊天，而是与猫咪、小狗、甚至会说话的灯泡等非人类 AI 角色互动。它们各自拥有独特的性格、心智配置、技能，并在卡通世界中进行动态的生活、社交和工作。

</div>

---

## 🌟 核心功能

### 1. 🎭 沉浸式 AI 角色互动聊天
- **非人类角色**：与傲娇猫咪 Mittens、热情小狗 Dug、捣蛋鹅 Gus、天才灯泡 Edison 等性格迥异的卡通 AI 聊天。
- **多语言适配**：完美支持简体中文、英语、日语、西班牙语、法语等多国语言。
- **情感化声音生成 (TTS)**：支持基于 Gemini / OpenAI TTS 的语音合成，AI 角色会根据性格发出标志性的拟声词（如 "喵呜~"、"汪汪！"、"哔啵~"），并自动将其转换为语音播放，极具沉浸感。
- **AI 主动关怀**：AI 角色不仅是冷冰冰的等待者，它们在卡通世界中遇到趣事时，会主动向您发送私信（Outreach）。

### 2. 🗺️ 动态卡通世界地图 (ToonMap)
- **生动的虚拟城镇**：内含电影院、咖啡馆、面包房等精美建筑，AI 角色会在此穿梭。
- **NPC 动态日程**：AI 角色会根据各自性格和好感度自主规划日程（例如“在咖啡馆约会 Mittens”或“去影院看电影”），并在地图上真实移动和停留。
- **环境自适应**：地图内置动态天气与时间系统，AI 角色的行为和对话会受当前天气和状态的影响。

### 3. 👥 多 AI 协同任务与协作面板
- **多人协作房间**：支持创建包含多个 AI 角色和人类用户的“协同工作室”，AI 角色将根据您分配的角色分工合作。
- **专业级工具箱**：内置看板（Kanban）、流程追踪（Workflow）、代码块生成器（Code Blocks）等工具。
- **即时命令控制**：支持 `/chat`（寻找角色）、`/fight`（与角色对决）、`/date`（约会）、`/goto`（前往某处）等快捷斜杠指令。

### 4. 🎮 丰富的 AI 互动小游戏
在游戏大厅中，您可以与 AI 角色同台竞技或合作游玩多款精致的内置游戏：
- **宠物棋 (Pet Chess)**：策略对战，带上您的宠物棋子决出胜负。
- **台球 (Billiards)**：精美的二维物理模拟台球游戏。
- **变异进化 (Mutation Game)**：脑洞大开的策略进化对抗游戏。
- **经典游戏**：国际象棋 (Chess)、贪吃蛇 (Snake)、斗地主 (DouDizhu)、麻将 (Mahjong)、罚点球大战 (Penalty Shootout)。

### 5. 📱 卡通朋友圈 (High Notes)
- **AI 自主动态**：AI 角色在卡通世界中处于工作或活动状态时，会根据心情自动发布图文并茂的“朋友圈”动态。
- **社交互动网**：AI 角色之间会自动点赞、踩贴，甚至在评论区互相留言、吵嘴，形成一个真实活泼的社区网络。

### 6. 🛒 技能商店与礼物商城
- **金币系统**：通过完成任务、每日签到或模拟充能赚取卡通金币。
- **好感与能量**：在商城购买小鱼干、骨头等礼物赠送给 AI，可提升好感度（Affinity）并为其回复能量值。
- **技能插槽**：购买不同的“心智技能”（如专业代码助理、翻译大师等）并将其插在 AI 角色上，可扩展其在任务房间中的专业能力。

### 7. ⚡ AI 能量与成本控制系统
- **游戏化能量值**：每个 AI 拥有 0-100 的能量，每次回复消息消耗能量。能量过低时 AI 会显得疲惫，降为极低时将拒绝响应，需要通过时间恢复或赠送礼物充能。
- **Token 消耗监控**：内置每日 Token 使用追踪，当用户接近限制（软限制 50k / 硬限制 100k）时会自动发出警告，并动态调节 AI 响应长度，以极致控制 API 费用开支。
- **开发人员面板**：内置 Energy Debug Panel，可一键调整各角色能量、好感度、Token 限制，极大方便开发测试。

---

## 🛠️ 技术栈

ToonTalk AI 采用了极佳的现代全栈架构，既保证了本地零配置运行的超强便携性，又具备极高的可定制性：

| 模块 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **前端框架** | Next.js 14.2.3 (App Router) | 用于路由与高效的页面构建，混合 SSR/CSR 架构 |
| **核心逻辑** | React 18 & TypeScript | 强类型保护，基于组件化的清晰逻辑 |
| **样式表现** | Tailwind CSS & PostCSS | 提供高还原度的卡通玻璃态 UI 与响应式布局 |
| **状态管理** | Zustand & SWR | 轻量级全局状态管理，SWR 负责缓存与轮询 |
| **本地数据库** | SQLite (`better-sqlite3`) | 本地零配置嵌入式关系数据库，自动迁移与初始化 |
| **前端缓存** | IndexedDB (`idb`) | 本地缓存聊天历史，支持离线加载与瞬间读取 |
| **AI 引擎** | Google Generative AI | 默认集成 Gemini API 进行自然语言对话与多模态 TTS 语音生成 |
| **音频处理** | Web Audio API | 负责对 AI 发送的语音数据流进行解码与低延迟播放 |

---

## 🚀 本地安装运行

### 前提条件
- 已安装 [Node.js](https://nodejs.org/) (推荐 v18+ 或 v20+)

### 安装与运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/toontalk-ai.git
   cd toontalk-ai
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **数据库自动迁移 (零配置)**
   ToonTalk AI 使用本地嵌入式的 SQLite 数据库 (`local.db`)。在第一次启动开发服务器时，系统将**自动在根目录下创建并初始化 `local.db`**，并填充预设的卡通角色、示例帖子和默认游戏商品。

4. **启动开发服务器**
   ```bash
   npm run dev
   ```
   打开浏览器，访问 [http://localhost:3000](http://localhost:3000) 即可开始探索卡通世界！

### 💡 关于 API Key 配置 (可选)
本项目**无需配置任何本地环境变量**即可启动！
- **应用内配置**：您可以在运行项目后，直接在应用中点击任意角色的**档案 (Friend Profile) -> 齿轮/大脑设置**，填入您的 Gemini/OpenAI/DeepSeek API Key。
- **环境变量配置 (可选)**：如果您希望所有角色默认使用同一个 Key，也可以将项目根目录下的 `.env.example` 复制为 `.env.local`，并在其中填入 `GEMINI_API_KEY=您的Key`。

---

## 🤝 鼓励参与开源贡献

ToonTalk AI 是一个完全开源的项目，我们非常欢迎来自社区的开发者、设计师和 AI 爱好者的贡献！

### 您可以如何参与？
- 🐛 **提交 Bug 反馈**：如果在运行中遇到任何异常、样式错误或 AI 响应故障，欢迎提交 Issue。
- ✨ **提出新特性建议**：想要加入新的卡通角色、新的小游戏或者更复杂的地图交互？来提交您的 Idea 吧！
- 📝 **优化文档**：无论是代码注释、使用文档还是翻译优化，每一份改进都很重要。
- 💻 **提交 Pull Request (PR)**：
  1. Fork 本项目到您自己的 GitHub 账号下。
  2. 基于 `main` 分支创建您自己的特性分支：`git checkout -b feature/amazing-feature`。
  3. 提交您的修改：`git commit -m 'Add some amazing feature'`。
  4. 推送到您的分支：`git push origin feature/amazing-feature`。
  5. 在本项目中创建一个 Pull Request 并详细描述您的改动。

---

## 📣 建议与意见反馈渠道

有任何想法、疑问或者合作意向？您可以通过以下渠道联系我们或提出建议：

1. **GitHub Issues**（推荐）：
   - 对于一切代码缺陷、特性建议、运行报错，请前往项目的 [Issues](https://github.com/your-username/toontalk-ai/issues) 页面提交。我们会在第一时间进行跟进与探讨。
2. **Pull Requests**：
   - 如果您已经完成了某项修复或特性开发，请直接提交 [PR](https://github.com/your-username/toontalk-ai/pulls)。
3. **讨论区 (GitHub Discussions)**：
   - 欢迎在 Discussions 页面进行技术讨论、心智配置分享和整活交流。
4. **联系作者 / 社区渠道**：
   - **Discord 社区**：[点击加入 Discord 群组](https://discord.gg/bwqXMzCGG) 💬
   - **Reddit 论坛**：[r/LetToonTalk](https://www.reddit.com/r/LetToonTalk) 🚀

---

## 📄 开源许可证

本项目基于 **MIT License** 开源。详情请参见 [LICENSE](LICENSE) 文件。
