<p align="center">
  <img src="public/logo.png" alt="BlockSky Logo" width="120" />
</p>

<h1 align="center">BlockSky</h1>

<p align="center">
  <strong>🛡️ Take control of your Bluesky experience</strong><br/>
  Mass block followers, following, and post interactions in seconds.
</p>

<p align="center">
  <a href="https://blocksky.app">🌐 blocksky.app</a> &bull;
  <a href="https://ko-fi.com/blockskyapp">☕ Support Us</a> &bull;
  <a href="https://github.com/kevenages/blocksky/issues">🐛 Report Issues</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.1-06B6D4?style=for-the-badge&logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/TanStack-Start-FF4154?style=for-the-badge" alt="TanStack Start" />
</p>

---

## ✨ What is BlockSky?

Tired of blocking accounts one by one? **BlockSky** lets you mass block followers, following, and users who interacted with a specific post. Perfect for protecting yourself from harassment campaigns, bot networks, or toxic communities.

Your **mutuals are always protected** — we'll never block someone you follow who follows you back.

---

## 🚀 Features

### ⚡ Block Followers & Following
Search for any Bluesky account and mass block their followers, their following, or both. Choose to also block the target account itself.

### 💬 Block Post Interactions
Paste any Bluesky post URL and block users who liked, reposted, quoted, or replied to it. Select which interaction types to include — all on by default.

### 🤝 Mutual Protection
Your mutuals are automatically skipped across all blocking modes. Official Bluesky accounts are also whitelisted.

### 📊 Real-time Progress & Auto-Resume
Watch live as accounts are blocked with a real-time progress bar. If you hit Bluesky's rate limits, BlockSky automatically counts down and resumes where it left off.

### 🔐 Two Login Options
- **Quick Login (OAuth)** — Most secure. You authenticate directly with Bluesky and your credentials never touch BlockSky. May hit rate limits sooner.
- **App Password** — Faster blocking with higher rate limits. Create one in Bluesky Settings > Privacy > App Passwords. Revoke anytime.

---

## 📖 How to Use

### Block Followers / Following
1. Visit [blocksky.app](https://blocksky.app)
2. Sign in with your Bluesky account
3. Search for the account whose followers you want to block
4. Click **Block Followers** or **Block Following**
5. Sit back and watch the progress

### Block Post Interactions
1. Visit [blocksky.app](https://blocksky.app)
2. Sign in with your Bluesky account
3. Navigate to **Block Post Interactions**
4. Paste a Bluesky post URL
5. Select which interaction types to block (likes, reposts, quotes, replies)
6. Click **Block** and watch the progress

---

## 🔒 Privacy & Security

- 🚫 We **never** store your Bluesky password
- 🔐 OAuth users authenticate directly with Bluesky
- 🍪 Session tokens stored in secure HTTP-only cookies
- 🗑️ App Password tokens only accessible during active blocking, then cleared
- 🤫 Your data is never shared or sold

---

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/kevenages/blocksky.git
cd blocksky

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Tech Stack

- [TanStack Start](https://tanstack.com/start) (React + Vite + SSR)
- [TypeScript](https://www.typescriptlang.org/) (strict mode)
- [@atproto/api](https://github.com/bluesky-social/atproto) for Bluesky integration
- [Tailwind CSS](https://tailwindcss.com/) v4
- [Radix UI](https://www.radix-ui.com/) primitives via shadcn/ui
- Cloud Run for hosting

---

## 💖 Support

If BlockSky has helped you, consider [buying us a coffee on Ko-fi](https://ko-fi.com/blockskyapp)!

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
