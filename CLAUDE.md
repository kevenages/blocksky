# Claude Code Project Instructions

## Do NOT include
- Never add "Generated with Claude Code" or similar attribution to PRs, releases, or code
- Never add "Co-Authored-By: Claude" to commits
- No mention of Claude/AI in any output

## Git Workflow
- Branch from `develop` for new features/fixes
- PR to `develop` first, then merge `develop` to `main` for releases
- Push order: develop → stage → main

## Deployment
- Project: `blocksky-prod`
- Services: `blocksky` (prod), `blocksky-stage`, `blocksky-dev`
- Region: `us-central1`
- **Default: Deploy to dev only** - User will explicitly request stage/prod deployments

### Cloud Build Triggers
Deployments are automated via GitHub pushes (triggers in `us-central1` region):
- `deploy-dev` → triggers on `develop` branch → deploys to `blocksky-dev`
- `deploy-stage` → triggers on `stage` branch → deploys to `blocksky-stage`
- `deploy-prod` → triggers on `main` branch → deploys to `blocksky` (prod)

Check builds: `gcloud builds list --region=us-central1 --project=blocksky-prod --limit=5`

To deploy all environments:
```bash
git push origin develop && \
git checkout stage && git merge develop --no-edit && git push origin stage && \
git checkout main && git merge develop --no-edit && git push origin main && \
git checkout develop
```

**Important:** Each trigger has `_APP_URL` substitution that MUST match the deployment URL:
- dev: Cloud Run URL
- stage: Cloud Run URL
- prod: `https://blocksky.app`

If `_APP_URL` is wrong, OAuth redirects will break (users get redirected to wrong domain).

### Cloudflare Configuration
- blocksky.app uses Cloudflare proxy (orange cloud)
- SSL/TLS mode: **Full (strict)**
- Redirect Rules: Only `www.blocksky.app` → `blocksky.app` (NOT "all requests" which causes infinite loop)
- DNS: A records pointing to Google's global load balancer IPs (Cloud Run custom domain mapping)

## Project Context
BlockSky is a Bluesky mass-blocking tool built with:
- TanStack Start (React + Vite + SSR)
- TypeScript
- @atproto/api for Bluesky integration
- Firestore for OAuth session storage
- Cloud Run for hosting

## Authentication Methods
BlockSky supports two login methods with different tradeoffs:

**OAuth (Quick Login)**
- Most secure - credentials never touch BlockSky
- Tokens stored in httpOnly cookies (XSS protected)
- Blocking runs server-side via `/api/block-stream`
- May hit rate limits faster due to server-side execution

**App Password**
- Faster blocking - runs client-side like original BlockSky
- Tokens stored in httpOnly cookies by default
- During active blocking, tokens are temporarily fetched via `/api/get-blocking-tokens`
- Tokens only in JavaScript memory during blocking operation, cleared after
- Users can revoke app passwords in Bluesky Settings → Privacy → App Passwords

## Blocking Approach
Different approaches based on auth method:

**OAuth users (server-side):**
- Blocking via `/api/block-stream` endpoint
- SSE streaming for real-time progress
- 5ms delay between blocks
- Rate limits may be stricter

**App Password users (client-side):**
- Blocking runs directly in browser via `src/lib/client-blocker.ts`
- Requests go directly to bsky.social (like original BlockSky)
- 50ms delay between blocks
- Token refresh every 50 blocks
- Faster and can block more before hitting rate limits

**Common to both:**
- Uses individual `block.create` calls (NOT batch `applyWrites`)
- Real-time progress updates
- Auto-resume when rate limit countdown ends (if user stays on page)

## Rate Limits (Bluesky API - 2026)
**Global API limits:**
- 3,000 requests per IP per 5 minutes
- Headers: `ratelimit-limit`, `ratelimit-remaining`, `ratelimit-reset` (Unix timestamp)

**PDS event limits:**
- 50 events/second
- 1,500 events/hour
- 10,000 events/day

**Points system (for writes):**
- CREATE = 3 points, UPDATE = 2 points, DELETE = 1 point
- 5,000 points/hour, 35,000 points/day
- Max ~1,666 creates per hour

## OAuth (2026 Standards)
- BlockSky uses OAuth with DPoP (confidential client)
- Access tokens: 15-30 min lifetime
- Refresh tokens: Up to 2 years for confidential clients
- Sessions can be maintained long-term with proper refresh
- Scopes: `atproto transition:generic`

## Logging
- Uses structured JSON logging for Cloud Logging
- Logger utility: `src/lib/logger.ts`
- Error Reporting automatically picks up errors with stack traces
- Key actions logged: login, block_batch, get_followers, etc.

## Monitoring
- Cloud Monitoring dashboard: "BlockSky Dashboard"
- Alert: "BlockSky - High Error Rate" → keven@duhado.com
- View at: console.cloud.google.com/monitoring?project=blocksky-prod

## Google Analytics (GA4)
- Measurement ID: `G-RVY854R6WS`
- Only loads in production (`window.location.hostname === 'blocksky.app'`)
- Helper: `src/lib/analytics.ts`
- GA script loaded inline in `src/routes/__root.tsx`

### Events Currently Tracked
| Event | Label | Value | When |
|-------|-------|-------|------|
| `login_start` | `oauth` or `app_password` | - | User clicks login |
| `login_success` | `oauth` or `app_password` | - | Login completes |
| `blocking_start` | `followers` or `following` | count to block | Blocking begins |
| `blocking_complete` | `followers` or `following` | count blocked | Blocking finishes |
| `rate_limit_hit` | - | count before limit | Rate limit encountered |
| `blocking_resume` | - | count remaining | User waited, blocking resumes |
| `block_following_confirm` | handle | follows count | User confirms Block Following dialog |
| `block_following_cancel` | handle | - | User cancels Block Following dialog |
| `block_also_target_toggle` | `on` or `off` | - | User toggles "Also block @handle" |
| `easter_egg_found` | - | - | User searches for themselves (Dig Dug) |
| `easter_egg_game_over` | - | score | Player dies in Dig Dug |
| `easter_egg_win` | - | score | Player clears all dirt in Dig Dug |

### GA4 Funnels
**Login Funnel:** `login_start` → `login_success`
**Blocking Funnel:** `blocking_start` → `blocking_complete`
**Rate Limit Retention:** `rate_limit_hit` → `blocking_resume` → `blocking_complete`

### GA4 Setup Notes
- Use "is indirectly followed by" between funnel steps (allows other events in between)
- Custom dimensions (`event_label`, `event_category`) must be registered in Admin → Custom definitions before they appear in Explorations
- Test with Realtime report: Reports → Realtime

### Analytics TODOs
**GA4 Admin (completed Feb 10, 2026):**
- [x] `event_label` custom dimension registered
- [x] `event_category` custom dimension registered
- [x] `value` custom metric registered (Standard unit)
- [x] `blocking_complete` marked as Key Event
- [x] Funnels configured: Login Conversion, Blocking Journey, Rate Limit Retention

**Code changes (completed Feb 10, 2026):**
- [x] Wire up `logout` event in user-menu
- [x] Wire up `cookie_consent` event (accept/decline)
- [x] Wire up `policy_open` events (privacy, cookies, terms sheets)
- [x] Wire up `faq_click` event on FAQ accordion
- [x] Wire up `external_link` events (Bluesky, Ko-fi, feedback links)
- [x] Fix missing `blocking_complete` for app password users (client-side)
- [x] Fix missing `blocking_complete` on OAuth resume completion

**User properties (completed Feb 15, 2026):**
- [x] `auth_method` user property registered (User scope) — set on login_success

**Block Following & Easter Egg events (completed Feb 15, 2026):**
- [x] `block_following_confirm` / `block_following_cancel` for confirmation dialog
- [x] `block_also_target_toggle` for the "Also block @handle" toggle
- [x] `easter_egg_found` / `easter_egg_game_over` / `easter_egg_win` for Dig Dug

## Social Sharing (Open Graph)
- Meta tags configured in `src/routes/__root.tsx`
- OG image: `public/og-image.png` (1200x630)
- Includes Open Graph and Twitter Card tags
- Test with: Facebook Sharing Debugger, Twitter Card Validator

## FOUC Prevention (Flash of Unstyled Content)
Solution implemented in `src/routes/__root.tsx`:
1. Inline theme detection script in `<head>` - sets dark class before render
2. Inline critical styles - body starts with `opacity: 0`
3. Script at end of body adds `css-loaded` class when stylesheet loads
4. CSS transition fades body to `opacity: 1`
This hides content until CSS is ready, preventing any flash.

## OAuth Metadata
- Dynamically generated via Nitro handler at `server/oauth-metadata.ts`
- Route configured in `vite.config.ts` handlers array
- Uses `APP_URL` env var for per-environment URLs

## Memory Leak Prevention
React components must properly clean up async operations to prevent:
- State updates on unmounted components
- "Phantom" operations consuming rate limits invisibly

**Patterns used:**
1. **AbortController for fetch** - Cancel streaming requests on unmount
   ```typescript
   const abortControllerRef = useRef<AbortController | null>(null)
   useEffect(() => {
     return () => abortControllerRef.current?.abort()
   }, [])
   ```

2. **Mounted ref for async operations** - Skip state updates if unmounted
   ```typescript
   const mountedRef = useRef(true)
   useEffect(() => {
     mountedRef.current = true
     return () => { mountedRef.current = false }
   }, [])
   // In async code: if (!mountedRef.current) return
   ```

3. **Timer cleanup** - Always clear intervals/timeouts
   ```typescript
   useEffect(() => {
     const timer = setInterval(...)
     return () => clearInterval(timer)
   }, [])
   ```

## Utility Scripts
Located in `scripts/` (gitignored):
- `unblock-all.ts` - Clear all blocks for a test account with retry logic
  ```bash
  APP_PASSWORD="xxx" npx tsx scripts/unblock-all.ts
  ```

## Test Account
- Handle: `testingblocks.bsky.social`
- Used for testing blocking functionality
- App password stored separately (not in repo)

## Future: Premium Background Queue (Issue #98)
Planned feature to handle rate limits automatically:
- Store block queue in Firestore
- Process in background even after user leaves
- OAuth sessions last up to 2 years for confidential clients
- Could notify via DM from @blocksky.app service account (opt-in)

## UI/UX Principles

**Metrics Display:**
- Metrics that report 0 should NEVER be bold - use regular weight and slightly muted color
- Non-zero metrics should be bold and use appropriate semantic colors
- Stack metrics vertically for clarity, not inline

**Dopamine Hits:**
- Completion events should trigger green success toasts - users love dopamine
- Use celebratory language for successes (e.g., "Done!" not just "Complete")
- Visual feedback should feel rewarding

## API Error Handling
- Server API endpoints (`server/api/*.ts`) must use `createError()` from h3 to return proper HTTP status codes
- Returning plain objects like `{ error: 'message' }` results in 200 OK, which clients may mishandle
- SSE streaming endpoints especially need proper error codes so clients don't try to parse error JSON as stream

## Code Cleanup (To Review)
Audit from Feb 2026 found potentially unused code. Verify before removing:

**API Endpoints (likely unused):**
- `server/api/oauth-start.ts` - OAuth handled via `getOAuthClient()` directly
- `server/api/waitlist.ts` - Premium waitlist feature not yet built

**Exports in `src/lib/auth.server.ts` (verify usage):**
- `getOAuthUrl` - may be unused, OAuth uses `getOAuthClient()` directly
- `blockUser` - single user blocking, keep if planning individual block feature
- `blockUsersBatch` - verify if used, blocking uses `/api/block-stream` or client-side
- `loginWithAppPassword` - may be unused, login uses `/api/login-app-password`

**Exports in `src/lib/oauth.ts`:**
- `getSessionAgent` - verify if used anywhere

**UI Components:**
- `src/components/ui/badge.tsx` - not currently imported

**npm Dependencies (likely removable):**
- `react-icons` - codebase uses `lucide-react`
- `@tanstack/react-devtools` - not imported (keep for debugging?)
- `@tanstack/react-router-devtools` - not imported (keep for debugging?)
- `web-vitals` - not used, GA handles analytics
- `tw-animate-css` - Tailwind animations used instead

## Easter Egg: Dig Dug
- Searching for yourself while logged in triggers a Dig Dug mini-game instead of blocking UI
- Component: `src/components/dig-dug-game.tsx`
- Canvas-based game with keyboard (arrow keys / WASD) and mobile swipe controls
- 2-second cooldown on game over/win before restart is allowed (prevents accidental restarts)
- Retro arcade header: "PLAYER 1 READY" in BlockSky blue monospace

## Block Following UX
- Confirmation dialog prevents accidental mass-blocks of someone's follows
- "Also block @handle" toggle (defaults on) prepends the target account DID to the block list
- Pre-fetches user's blocked DIDs on profile select to show accurate "already blocked" status
- `targetAlreadyBlocked` state disables the toggle when account is already blocked

## Deployment Gotchas

**Mobile browser caching after deploys:**
- After deploying new code, mobile browsers may serve cached JS bundles
- Symptoms: UI renders but functionality is broken (e.g., blocking shows 0 blocked)
- Fix: Users need to log out and back in, hard refresh, or use incognito
- This is NOT a code bug — the stale JS bundle causes the issue

## Known Issues
- **h3 vulnerability (CVE-2026-23527)**: HTTP Request Smuggling, High severity
  - Vinxi 0.5.11 (latest) still uses h3@1.15.3 (vulnerable <= 1.15.4)
  - Waiting for vinxi to update h3 dependency
  - Check: `npm ls h3` and Dependabot alert #46
