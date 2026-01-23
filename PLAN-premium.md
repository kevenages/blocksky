# BlockSky Premium Features Plan

## Overview

BlockSky has a free, MIT-licensed core (public repo) with premium features delivered via server-side code (private, not in public repo).

---

## Architecture

### Principle: Server-Side Only

Premium logic lives entirely on the server. The public repo contains:
- Free feature code
- API calls to premium endpoints
- UI that checks entitlements and shows upgrade prompts

The private repo/server contains:
- Premium feature implementation
- Payment webhook handlers
- Entitlement management
- Background job processing

### Why Server-Side?

1. **Code protection** - Premium logic never ships to client
2. **Simple separation** - Public repo stays MIT, no license confusion
3. **Easier updates** - Deploy premium changes without app updates
4. **Required anyway** - Background queue needs server-side processing

### Tech Stack (Premium Backend)

- **Runtime:** Cloud Run (already using for free tier)
- **Database:** Firestore or Cloud SQL (user entitlements, job queue)
- **Payments:** Stripe (webhooks → entitlement updates)
- **Job Queue:** Cloud Tasks or Bull (background blocking jobs)

---

## Payment Model

### Hybrid Approach

| Type | Use Case | Price Point |
|------|----------|-------------|
| **One-time purchases** | Urgent/emotional features | $3-5 per feature |
| **Subscription** | Power user convenience | $5-10/month |

### Rationale

- Most users are occasional → one-time purchases convert better
- "I'm Under Attack" is emotional/urgent → high impulse buy potential
- Power users who block regularly → subscription makes sense
- Capture both audiences without leaving money on the table

### Entitlement Logic

```
canAccessFeature(userId, feature):
  if user.hasActiveSubscription → true
  if user.purchases.includes(feature) → true
  return false
```

### Stripe Integration

- Stripe Checkout for purchases
- Stripe Customer Portal for subscription management
- Webhooks update Firestore entitlements
- Handle: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted

---

## Premium Features

### Tier 1: One-Time Purchases

#### "I'm Under Attack" Mode ($3-5)
**Purpose:** Block recent followers during a brigading attack

**How it works:**
1. User clicks "I'm Under Attack"
2. Select timeframe: last 1h, 6h, 24h, 7 days
3. Fetch user's recent followers
4. Preview: "Block 847 accounts that followed you since yesterday?"
5. Confirm and block (respects rate limits, auto-resumes)

**Technical considerations:**
- Bluesky API doesn't provide "followed at" timestamps
- Options:
  - Track followers over time (requires data storage for premium users)
  - Use heuristics (follower list order is roughly chronological)
  - Compare current followers vs cached snapshot

**Why premium:** Urgent need = willingness to pay. Different from free feature.

---

### Tier 2: Subscription Features ($5-10/month)

#### Background Queue
**Purpose:** Blocking continues even if user closes the page

**How it works:**
1. User starts blocking, can close page
2. Job added to server-side queue
3. Worker processes blocks respecting rate limits
4. User can check status anytime, gets notified when done

**Technical requirements:**
- Cloud Tasks or Bull queue
- Worker service (Cloud Run job or always-on instance)
- Store job state in Firestore
- OAuth token refresh handling for long-running jobs

#### Session Persistence
**Purpose:** Blocking progress survives page refresh

**How it works:**
- Store blocking state server-side (not just sessionStorage)
- On page load, check for active/paused blocking session
- Resume from where it left off

**Technical requirements:**
- Firestore document per active session
- Sync state between client and server

#### Email Notifications
**Purpose:** Get notified when blocking completes

**How it works:**
- User provides email (or we get from Bluesky profile if available)
- Send email when: job complete, rate limit hit (optional), errors

**Technical requirements:**
- SendGrid or similar email service
- Email templates
- User notification preferences

#### Bulk Unblock
**Purpose:** Mass unblock accounts you've previously blocked

**How it works:**
1. Fetch user's block list
2. Filter/search options (by handle, date blocked if tracked)
3. Select accounts to unblock
4. Process unblocks (same rate limit handling)

---

## Database Schema (Firestore)

```
users/{odic}
  - email: string (optional)
  - stripeCustomerId: string
  - subscription: {
      status: 'active' | 'canceled' | 'past_due'
      currentPeriodEnd: timestamp
      planId: string
    }
  - purchases: ['attack_mode', 'bulk_unblock', ...]
  - createdAt: timestamp

blocking_jobs/{jobId}
  - odic: string
  - type: 'followers' | 'following' | 'attack_mode' | 'unblock'
  - targetDids: string[]
  - status: 'queued' | 'processing' | 'paused' | 'completed' | 'failed'
  - progress: {
      blocked: number
      failed: number
      total: number
    }
  - rateLimitResetAt: timestamp | null
  - createdAt: timestamp
  - updatedAt: timestamp

follower_snapshots/{odic}  (for attack mode)
  - followers: string[] (DIDs)
  - capturedAt: timestamp
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Set up Stripe account and products
- [ ] Create premium backend service (separate Cloud Run)
- [ ] Implement Firestore schema
- [ ] Build entitlement checking API
- [ ] Add "Upgrade" prompts in free app UI

### Phase 2: Background Queue (Subscription)
- [ ] Implement job queue (Cloud Tasks)
- [ ] Build worker service
- [ ] Handle OAuth token refresh for long jobs
- [ ] Add job status UI
- [ ] Implement session persistence

### Phase 3: "I'm Under Attack" Mode (One-time)
- [ ] Build follower snapshot system
- [ ] Implement recent follower detection
- [ ] Create attack mode UI
- [ ] One-time purchase flow via Stripe

### Phase 4: Notifications & Polish
- [ ] Email notification system
- [ ] Bulk unblock feature
- [ ] Subscription management portal
- [ ] Usage analytics for premium features

---

## Pricing Strategy

### Launch Pricing (Validate demand)

| Feature | Price | Type |
|---------|-------|------|
| "I'm Under Attack" | $3 | One-time |
| Premium Subscription | $5/month | Recurring |

### Future Considerations

- Annual subscription discount (2 months free)
- Bundle: Attack mode included in subscription
- Volume pricing? (probably not needed for this use case)

---

## Open Questions

1. **Token storage for background jobs:** How long can we store OAuth tokens? Do we need user to re-auth for long jobs?

2. **Follower tracking for attack mode:** Store snapshots periodically, or only when user enables it?

3. **Free trial?** Offer 1 free "attack mode" use to hook users?

4. **Pricing validation:** Start lower and increase, or start higher and discount?

5. **Self-hosted PDS users:** Do they have different rate limits? Special tier?

---

## Success Metrics

- Conversion rate: Free → Premium
- One-time purchase rate during brigading events
- Subscription retention (monthly churn)
- Revenue per user
- Feature usage by premium users
