import { analytics } from '@/lib/analytics'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export function FaqSection() {
  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
      <Accordion type="single" collapsible className="w-full" onValueChange={(value) => { if (value) analytics.clickFaq(value) }}>
        <AccordionItem value="close-page">
          <AccordionTrigger>Can I close the page while blocking?</AccordionTrigger>
          <AccordionContent>
            No, you need to keep the page open until blocking completes. If you close or navigate away, blocking will stop. Any accounts already blocked will stay blocked, but remaining accounts won't be processed. If you hit a rate limit, BlockSky will automatically resume when the limit resets - just keep the page open.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="login-methods">
          <AccordionTrigger>What's the difference between Quick Login and App Password?</AccordionTrigger>
          <AccordionContent>
            <p className="mb-2"><strong>App Password</strong> is the fastest option. Blocking requests go directly from your browser to Bluesky, just like the original BlockSky. The tradeoff is slightly reduced security - session tokens are temporarily accessible to JavaScript during blocking. You can revoke app passwords anytime in Bluesky Settings → Privacy → App Passwords.</p>
            <p><strong>Quick Login (OAuth)</strong> is the most secure option. Your credentials never touch BlockSky - you authenticate directly with Bluesky. Blocking runs through our server, which may hit rate limits sooner due to shared infrastructure.</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="app-password-speed">
          <AccordionTrigger>Why is App Password faster than Quick Login?</AccordionTrigger>
          <AccordionContent>
            With App Password, blocking runs directly in your browser - requests go straight to Bluesky without passing through our servers. This is the same approach the original BlockSky used. Quick Login (OAuth) routes requests through our server for enhanced security, which can hit Bluesky's rate limits sooner.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="rate-limits">
          <AccordionTrigger>What are rate limits?</AccordionTrigger>
          <AccordionContent>
            Bluesky limits how quickly you can perform actions like blocking. This is a platform-wide protection, not something BlockSky controls. If you hit the limit, BlockSky automatically pauses and shows a countdown. When the limit resets, blocking resumes automatically - just keep the page open.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="safety">
          <AccordionTrigger>Is this safe to use? Will my account get banned?</AccordionTrigger>
          <AccordionContent>
            BlockSky uses Bluesky's official authentication methods (OAuth and App Passwords) and respects their rate limits. We don't do anything that violates Bluesky's terms of service. Blocking accounts is a standard feature that Bluesky provides to all users.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="credentials">
          <AccordionTrigger>Do you store my password or credentials?</AccordionTrigger>
          <AccordionContent>
            No. We never store your password. Session tokens are kept in secure HTTP-only cookies and are only used to communicate with Bluesky on your behalf.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="mutuals">
          <AccordionTrigger>What are mutuals and why aren't they blocked?</AccordionTrigger>
          <AccordionContent>
            Mutuals are accounts that you follow who also follow you back. BlockSky automatically protects these relationships by never blocking your mutuals, even if they follow the account you're targeting.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="undo">
          <AccordionTrigger>Can I undo or unblock everyone?</AccordionTrigger>
          <AccordionContent>
            Currently, BlockSky only handles blocking. To unblock accounts, you'll need to do so through Bluesky directly in your Settings &gt; Moderation &gt; Blocked accounts. We may add bulk unblocking in a future update.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skipped">
          <AccordionTrigger>Why are some accounts skipped?</AccordionTrigger>
          <AccordionContent>
            Accounts are skipped if they're your mutuals, if you've already blocked them, or if they're official Bluesky accounts (like @bsky.app). This prevents accidentally blocking important accounts.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="post-interactions">
          <AccordionTrigger>What is Block Post Interactions?</AccordionTrigger>
          <AccordionContent>
            Block Post Interactions lets you paste a Bluesky post URL and block users who liked, reposted, quoted, or replied to it. You can choose which interaction types to include. It's useful for blocking users who engage with harmful or problematic posts.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="post-interactions-dedup">
          <AccordionTrigger>What happens if someone liked AND reposted?</AccordionTrigger>
          <AccordionContent>
            Users are deduplicated automatically. If someone liked, reposted, and replied to the same post, they'll only be blocked once. BlockSky collects all unique users across your selected interaction types before blocking.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="post-author">
          <AccordionTrigger>Will the post author be blocked?</AccordionTrigger>
          <AccordionContent>
            No. The post author is automatically skipped when blocking post interactions. Only users who interacted with the post (liked, reposted, quoted, or replied) are included in the block list.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="data">
          <AccordionTrigger>What data do you collect?</AccordionTrigger>
          <AccordionContent>
            We collect minimal anonymous analytics to improve the service. We don't track who you block or store your block list. Your Bluesky profile information is only used during your session and isn't permanently stored.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
