export interface FaqEntry {
  id: string
  question: string
  answer: string
}

// Plain-text answers used for both the rendered FAQ accordion (where some
// items use JSX for emphasis) and the FAQPage JSON-LD schema. Keep answers
// here as the single source of truth — render-side embellishments live
// in the component.
export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'close-page',
    question: 'Can I close the page while blocking?',
    answer:
      "No, you need to keep the page open until blocking completes. If you close or navigate away, blocking will stop. Any accounts already blocked will stay blocked, but remaining accounts won't be processed. If you hit a rate limit, BlockSky will automatically resume when the limit resets - just keep the page open.",
  },
  {
    id: 'login-methods',
    question: "What's the difference between Quick Login and App Password?",
    answer:
      'App Password is the fastest option. Blocking requests go directly from your browser to Bluesky, just like the original BlockSky. The tradeoff is slightly reduced security - session tokens are temporarily accessible to JavaScript during blocking. You can revoke app passwords anytime in Bluesky Settings → Privacy → App Passwords. Quick Login (OAuth) is the most secure option. Your credentials never touch BlockSky - you authenticate directly with Bluesky. Blocking runs through our server, which may hit rate limits sooner due to shared infrastructure.',
  },
  {
    id: 'app-password-speed',
    question: 'Why is App Password faster than Quick Login?',
    answer:
      "With App Password, blocking runs directly in your browser - requests go straight to Bluesky without passing through our servers. This is the same approach the original BlockSky used. Quick Login (OAuth) routes requests through our server for enhanced security, which can hit Bluesky's rate limits sooner.",
  },
  {
    id: 'rate-limits',
    question: 'What are rate limits?',
    answer:
      'Bluesky limits how quickly you can perform actions like blocking. This is a platform-wide protection, not something BlockSky controls. If you hit the limit, BlockSky automatically pauses and shows a countdown. When the limit resets, blocking resumes automatically - just keep the page open.',
  },
  {
    id: 'safety',
    question: 'Is this safe to use? Will my account get banned?',
    answer:
      "BlockSky uses Bluesky's official authentication methods (OAuth and App Passwords) and respects their rate limits. We don't do anything that violates Bluesky's terms of service. Blocking accounts is a standard feature that Bluesky provides to all users.",
  },
  {
    id: 'credentials',
    question: 'Do you store my password or credentials?',
    answer:
      'No. We never store your password. Session tokens are kept in secure HTTP-only cookies and are only used to communicate with Bluesky on your behalf.',
  },
  {
    id: 'mutuals',
    question: "What are mutuals and why aren't they blocked?",
    answer:
      "Mutuals are accounts that you follow who also follow you back. BlockSky automatically protects these relationships by never blocking your mutuals, even if they follow the account you're targeting.",
  },
  {
    id: 'undo',
    question: 'Can I undo or unblock everyone?',
    answer:
      "Currently, BlockSky only handles blocking. To unblock accounts, you'll need to do so through Bluesky directly in your Settings > Moderation > Blocked accounts. We may add bulk unblocking in a future update.",
  },
  {
    id: 'skipped',
    question: 'Why are some accounts skipped?',
    answer:
      "Accounts are skipped if they're your mutuals, if you've already blocked them, or if they're official Bluesky accounts (like @bsky.app). This prevents accidentally blocking important accounts.",
  },
  {
    id: 'post-interactions',
    question: 'What is Block Post Interactions?',
    answer:
      "Block Post Interactions lets you paste a Bluesky post URL and block users who liked, reposted, quoted, or replied to it. You can choose which interaction types to include. It's useful for blocking users who engage with harmful or problematic posts.",
  },
  {
    id: 'post-interactions-dedup',
    question: 'What happens if someone liked AND reposted?',
    answer:
      "Users are deduplicated automatically. If someone liked, reposted, and replied to the same post, they'll only be blocked once. BlockSky collects all unique users across your selected interaction types before blocking.",
  },
  {
    id: 'post-author',
    question: 'Will the post author be blocked?',
    answer:
      'No. The post author is automatically skipped when blocking post interactions. Only users who interacted with the post (liked, reposted, quoted, or replied) are included in the block list.',
  },
  {
    id: 'data',
    question: 'What data do you collect?',
    answer:
      "We collect minimal anonymous analytics to improve the service. We don't track who you block or store your block list. Your Bluesky profile information is only used during your session and isn't permanently stored.",
  },
]
