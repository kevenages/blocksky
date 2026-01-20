# Claude Code Project Instructions

## Do NOT include
- Never add "Generated with Claude Code" or similar attribution to PRs, releases, or code
- Never add "Co-Authored-By: Claude" to commits
- No mention of Claude/AI in any output

## Git Workflow
- Branch from `develop` for new features/fixes
- PR to `develop` first, then merge `develop` to `main` for releases

## Project Context
BlockSky is a Bluesky mass-blocking tool rebuilt with TanStack Start, TypeScript, shadcn/ui, and @atproto/api.

## Session Notes - BlockSky Rebuild (Jan 2026)

### Architecture
- **Framework**: TanStack Start (moved from Next.js)
- **UI**: shadcn/ui components
- **Auth**: Bluesky OAuth via @atproto/oauth-client-node
- **Styling**: Tailwind CSS

### Key Files
- `src/lib/auth.server.ts` - All server functions (OAuth, search, blocking)
- `src/lib/oauth.ts` - OAuth client with globalThis persistence for session storage
- `src/routes/index.tsx` - Main page with search and blocking UI
- `src/components/profile-search.tsx` - Autosuggest search component
- `public/.well-known/oauth-client.json` - OAuth client metadata (update URLs for deployment)

### API Strategy (Important!)
- **Search & getProfile**: Use PUBLIC API (`https://public.api.bsky.app`) - allows finding users you've blocked
- **getFollowers & getFollowing**: Use AUTHENTICATED API - auto-filters already-blocked users (saves API calls!)
- **getMutuals**: Use PUBLIC API for fetching, finds intersection of followers/follows
- **blockUsersBatch**: Use AUTHENTICATED API with `applyWrites` for batch blocking

### Rate Limit Optimization
- Bluesky limit: 5000 requests/hour per user
- **DO NOT** fetch user's blocked list - wastes 100+ API calls and authenticated getFollowers already filters them
- Batch size: 200 users per `applyWrites` call
- Retry logic: 3 attempts with 5-10 second delays on rate limit (429)
- Small delay (100ms) between batches

### Blocking Flow
1. Fetch mutuals (user's followers + follows, find intersection) - cached per session
2. Fetch target's followers/following via authenticated API (auto-excludes already-blocked)
3. Filter out: mutuals, self, whitelisted (*.bsky.app, *.bsky.team)
4. Block in batches of 200 using `applyWrites`

### Features Implemented
- OAuth login with Bluesky
- Profile search (searches both handle and display name)
- Block followers / Block following buttons
- Progress UI with batch updates
- Mutual protection (never blocks your mutuals)
- Ko-fi donation link after blocking completes
- Cookie consent banner
- Privacy policy & Cookie policy sheets
- Rate limit error handling with user-friendly messages

### Testing
- Use Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:3000`) for OAuth testing
- Test account: testingblocks.bsky.social
- Wipe blocks script: `node wipe-blocks.mjs <handle> <app-password>` (gitignored)

### Known Issues / TODOs
- Rate limits can be hit if user has huge follower/following counts or does multiple large blocks per hour
- Old code reference: https://github.com/kevenages/blocksky (has streaming SSE progress)
