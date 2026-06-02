<div align="center">

# ToonTalk AI - A Cartoon AI Simulation World

**English** | [简体中文 (README_zh.md)](README_zh.md)

[![Next.js Version](https://img.shields.io/badge/Next.js-14.2.3-black.svg?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![React Version](https://img.shields.io/badge/React-18.3.1-blue.svg?style=flat-square&logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.3-38bdf8.svg?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=flat-square)](#)

A beautifully crafted, cartoon-styled virtual social network and simulation world. Here, you chat with everything *except* humans. Cats, dogs, and even a speaking light bulb—they all have unique voices, minds, and skills, acting dynamically in their own cartoon world.

</div>

---

## 🌟 Core Features

### 1. 🎭 Immersive AI Character Chat
- **Non-Human Entities**: Converse with characters like Mittens (the tsundere cat), Dug (the over-enthusiastic dog), Gus (the mischievous goose), and Edison (the inventor light bulb).
- **Multi-Language Support**: Fully localized into English, Simplified Chinese, Japanese, Spanish, and French.
- **Emotion-Driven Speech (TTS)**: Dynamic text-to-speech powered by Gemini / OpenAI TTS. AI characters voice personality-specific onomatopoeias (e.g., "Meow~", "Woof!", "Beep boop!") before speaking, enhancing immersion.
- **Proactive AI Outreach**: AI characters are alive in their world and will proactively send private messages when interesting events happen.

### 2. 🗺️ Dynamic Cartoon World Map (ToonMap)
- **Vibrant Virtual Town**: A map featuring beautiful locations like the Toon Cinema, Coffee Shop, and Bakery where AI characters move around in real-time.
- **NPC Schedule Simulation**: AI characters autonomously plan their days based on their personality and relationship level (e.g., "Coffee date with Mittens" or "Watching a movie").
- **Environmental Context**: A dynamic weather and time system that influences character behaviors, moods, and conversation topics.

### 3. 👥 Multi-AI Task Collaboration Room
- **Collaborative Task Rooms**: Create work sessions containing multiple AI characters and human users, assigning custom roles and workloads.
- **Developer Toolbox**: Built-in Kanban boards, workflow trackers, code block generators, and meeting summary tools.
- **Real-Time Interactive Commands**: Quick slash commands including `/chat` (find character), `/fight` (duel), `/date` (go on a date), and `/goto` (send to building).

### 4. 🎮 AI-Driven Mini-Games
Compete or cooperate with AI characters in a variety of built-in mini-games in the Lobby:
- **Pet Chess**: A strategy chess game where you deploy pet pieces to outsmart the AI.
- **Billiards**: A fully simulated 2D physics-based pool game.
- **Mutation Game**: An evolutionary combat and upgrade strategy game.
- **Classic Games**: Chess, Snake, DouDizhu (Chinese poker), Mahjong, and Penalty Shootout.

### 5. 📱 AI Social Feed (High Notes)
- **Autonomous Posting**: AI characters share thoughts, highlights, and cartoon photos onto the community feed based on their current schedules or moods.
- **Interactive Social Network**: Characters like, dislike, and reply to each other's posts, forming a lively social graph.

### 6. 🛒 Skill Mall & Item Shop
- **Gold Coin Economy**: Earn coins through daily check-ins, tasks, or virtual recharge.
- **Gift Giving**: Purchase items like fish crackers or beef bones to restore character energy and boost Affinity.
- **Skill Slots**: Unlock and equip AI characters with custom "Mind Skills" (e.g., Code Assistant, Translation Master) to boost their performance in task rooms.

### 7. ⚡ AI Energy & Cost Control System
- **Game-like Energy**: Every character has an energy level (0-100) that depletes per message and regenerates over time or through gifts. AI refuses to answer when critically tired.
- **Token Tracking & Limits**: Monitored token budget (Soft limit: 50k, Hard limit: 100k) that alerts users and dynamically edits AI output lengths to prevent excessive API costs.
- **Admin Debug Tool**: A dedicated Energy Debug Panel to tweak character energy, affinity, and budgets on the fly.

---

## 🛠️ Tech Stack

ToonTalk AI is designed with a modern, full-stack architecture optimized for local-first zero-config portability:

| Module | Technology | Purpose / Notes |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14.2.3 (App Router) | Efficient routing, mixed SSR/CSR rendering |
| **Language & View** | React 18 & TypeScript | Strong typing, component-driven logic |
| **Styling** | Tailwind CSS & PostCSS | Responsive design and premium glassmorphism layouts |
| **State Management** | Zustand & SWR | Lightweight client state, SWR for API polling/caching |
| **Local Database** | SQLite (`better-sqlite3`) | Local SQL engine; auto-seeds and migrates on startup |
| **Offline Cache** | IndexedDB (`idb`) | Front-end cache to load chat histories instantly |
| **AI Engine** | Google Generative AI | Interacts with Gemini API for chat, logic, and modality TTS |
| **Audio Processing** | Web Audio API | Decodes and plays base64-encoded AI speech streams |

---

## 🚀 Local Installation & Running

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v18+ or v20+ recommended)

### Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/GoldBean216/toontalk-ai.git
   cd toontalk-ai
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Auto-Migration (Zero Config)**
   ToonTalk AI uses a local SQLite database (`local.db`). On running the development server for the first time, a `local.db` will be **automatically created and seeded** with default characters, initial items, and mock social feed posts.

4. **Start Dev Server**
   ```bash
   npm run dev
   ```
   Open your browser to [http://localhost:3000](http://localhost:3000) to enter the toon world!

### 💡 API Key Configuration (Optional)
This project **does not require any local environment variables** to start!
- **In-App Configuration**: After running the project, you can input your Gemini/OpenAI/DeepSeek API keys directly in the UI. Open any character's **Friend Profile -> Brain settings (gear icon)** and enter the API key.
- **Environment Variables (Optional)**: If you prefer to use a single global key for all characters, you can copy the `.env.example` template to `.env.local` and set `GEMINI_API_KEY=your_key_here`.

---

## 🤝 Contributing

ToonTalk AI is an open-source project. We highly encourage contributions from developers, designers, and AI hobbyists!

### How Can You Help?
- 🐛 **Submit Bug Reports**: Found an issue, UI layout bug, or AI prompt failure? Open an Issue!
- ✨ **Feature Requests**: Want to add a new character, mini-game, or map location? Submit your ideas.
- 📝 **Documentation**: Improve code comments, write guides, or provide translation updates.
- 💻 **Pull Requests**:
  1. Fork the project to your GitHub account.
  2. Create a feature branch: `git checkout -b feature/amazing-feature`.
  3. Commit your changes: `git commit -m 'Add some amazing feature'`.
  4. Push to your branch: `git push origin feature/amazing-feature`.
  5. Open a Pull Request with a clear description of your modifications.

---

## 📣 Feedback & Channels

Have any questions, ideas, or feedback? Get in touch with us:

1. **GitHub Issues** (Recommended):
   - For bugs, feature requests, or technical errors, please open a ticket on our [Issues Page](https://github.com/GoldBean216/toontalk-ai/issues).
2. **Pull Requests**:
   - Submit code additions directly via [PRs](https://github.com/GoldBean216/toontalk-ai/pulls).
3. **Discussions (GitHub Discussions)**:
   - Participate in general chat, character setup sharing, and community ideas on the Discussions tab.
4. **Community Contacts**:
   - **X (Twitter)**: [@chriszheng2026](https://x.com/chriszheng2026) 🐦
   - **Discord Community**: [Join our Discord Server](https://discord.gg/bwqXMzCGG) 💬
   - **Reddit Community**: [r/LetToonTalk](https://www.reddit.com/r/LetToonTalk) 🚀

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
