import { analytics } from '@/lib/analytics'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { FAQ_ENTRIES } from '@/data/faq'

// One entry needs JSX emphasis that the plain-text data file can't express
const RENDERED_ANSWERS: Record<string, React.ReactNode> = {
  'login-methods': (
    <>
      <p className="mb-2">
        <strong>App Password</strong> is the fastest option. Blocking requests go directly from your
        browser to Bluesky, just like the original BlockSky. The tradeoff is slightly reduced security -
        session tokens are temporarily accessible to JavaScript during blocking. You can revoke app
        passwords anytime in Bluesky Settings → Privacy → App Passwords.
      </p>
      <p>
        <strong>Quick Login (OAuth)</strong> is the most secure option. Your credentials never touch
        BlockSky - you authenticate directly with Bluesky. Blocking runs through our server, which may
        hit rate limits sooner due to shared infrastructure.
      </p>
    </>
  ),
}

export function FaqSection() {
  return (
    <div className="w-full max-w-4xl">
      <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
      <Accordion
        type="single"
        collapsible
        className="w-full"
        onValueChange={(value) => {
          if (value) analytics.clickFaq(value)
        }}
      >
        {FAQ_ENTRIES.map((entry) => (
          <AccordionItem key={entry.id} value={entry.id}>
            <AccordionTrigger>{entry.question}</AccordionTrigger>
            <AccordionContent>{RENDERED_ANSWERS[entry.id] ?? entry.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
