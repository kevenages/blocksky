# Telemetry & Analytics System - Project Plan

## Overview

Build a GCP-native telemetry system that collects user interactions, errors, and performance metrics with granular user consent controls. Data will be centralized in Cloud Logging for support staff and developers.

---

## Goals

1. **Full observability** - Client errors, server errors, and user actions in one place
2. **User control** - Granular opt-out for different data categories
3. **Support workflows** - Easy lookup by session ID for debugging
4. **Developer insights** - Error trends, latency issues, feature usage
5. **Privacy compliant** - GDPR/CCPA ready with consent management

---

## Data Categories & Consent Levels

| Category | Description | Default | Opt-out? | What's Collected |
|----------|-------------|---------|----------|------------------|
| **Essential** | Required for app function | ON | No | Server errors, auth failures, security events |
| **Functional** | Helps fix bugs | ON | Yes | Client errors, stack traces, performance metrics |
| **Analytics** | Improves UX | ON | Yes | Button clicks, feature usage, page views |
| **Diagnostic** | Deep debugging | ON | Yes | Session context, user journey, timing data |

**All categories default to ON** to maximize data collection. Users see a consent banner and can customize preferences at any time.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Consent      │  │ Telemetry    │  │ Error        │              │
│  │ Manager      │  │ Client       │  │ Boundary     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┼─────────────────┘                       │
│                           │                                          │
│                           ▼                                          │
│                   POST /api/telemetry                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           SERVER                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                  /api/telemetry                           │       │
│  │  • Validates consent                                      │       │
│  │  • Enriches with session ID                               │       │
│  │  • Sanitizes PII based on consent                         │       │
│  │  • Writes structured logs                                 │       │
│  └──────────────────────────────────────────────────────────┘       │
│                           │                                          │
│                           ▼                                          │
│                   Cloud Logging                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         GCP                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │ Cloud Logging  │  │ Error          │  │ Cloud          │        │
│  │                │  │ Reporting      │  │ Monitoring     │        │
│  │ • All events   │  │ • Aggregated   │  │ • Dashboards   │        │
│  │ • Searchable   │  │   errors       │  │ • Alerts       │        │
│  │ • 30-day       │  │ • Stack traces │  │ • Metrics      │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│           │                                       │                  │
│           ▼                                       ▼                  │
│  ┌────────────────┐                    ┌────────────────┐           │
│  │ BigQuery       │                    │ Support        │           │
│  │ (optional)     │                    │ Dashboard      │           │
│  │ • Long-term    │                    │                │           │
│  │ • SQL queries  │                    │                │           │
│  └────────────────┘                    └────────────────┘           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
**Goal:** Basic telemetry pipeline working end-to-end

#### 1.1 Session Management
- [ ] Generate anonymous session ID on app load (UUID v4)
- [ ] Store in memory (not localStorage - privacy friendly)
- [ ] Pass session ID to all API calls via header
- [ ] Server extracts and includes in all logs

#### 1.2 Telemetry API Endpoint
- [ ] Create `POST /api/telemetry` endpoint
- [ ] Accept batched events (reduce network calls)
- [ ] Validate event structure
- [ ] Write to Cloud Logging with proper structure
- [ ] Rate limiting (prevent abuse)

#### 1.3 Structured Log Format
```typescript
interface TelemetryEvent {
  // Identifiers (no PII without consent)
  sessionId: string
  eventId: string

  // Event info
  category: 'essential' | 'functional' | 'analytics' | 'diagnostic'
  type: 'error' | 'click' | 'pageview' | 'performance' | 'action'
  name: string

  // Context
  timestamp: string
  url: string
  userAgent?: string  // Only with functional consent

  // Payload (varies by event type)
  data?: Record<string, unknown>

  // Error-specific
  error?: {
    message: string
    stack?: string
    componentStack?: string
  }

  // Performance-specific
  performance?: {
    duration?: number
    metric?: string
    value?: number
  }
}
```

#### 1.4 Update Existing Logger
- [ ] Add session ID to all server logs
- [ ] Add request ID for correlation
- [ ] Ensure consistent format with client events

---

### Phase 2: Client-Side Telemetry SDK

#### 2.1 Telemetry Context Provider
- [ ] Create `TelemetryProvider` React context
- [ ] Manages session ID
- [ ] Batches events (send every 5s or 10 events)
- [ ] Flushes on page unload
- [ ] Respects consent preferences

#### 2.2 Error Boundary Integration
- [ ] Create `TelemetryErrorBoundary` component
- [ ] Captures React errors with component stack
- [ ] Reports to telemetry endpoint
- [ ] Shows user-friendly error UI

#### 2.3 Automatic Captures
- [ ] Unhandled promise rejections
- [ ] Console errors (opt-in)
- [ ] Performance metrics (LCP, FID, CLS)
- [ ] Page navigation

#### 2.4 Manual Event Helpers
```typescript
// Usage examples
telemetry.track('button_click', { button: 'block_followers' })
telemetry.trackError(error, { context: 'blocking' })
telemetry.trackPerformance('api_call', { duration: 150, endpoint: '/api/block' })
```

---

### Phase 3: Consent Management

#### 3.1 Consent State
```typescript
interface ConsentPreferences {
  essential: true        // Always true, can't opt out
  functional: boolean    // Default: true
  analytics: boolean     // Default: true
  diagnostic: boolean    // Default: true
  updatedAt: string
}
```

**All categories default to ON.** Users can toggle each off individually (except Essential).

#### 3.2 Consent UI Components
- [ ] `ConsentBanner` - First visit, bottom of screen
- [ ] `ConsentModal` - Detailed preferences
- [ ] `ConsentSettings` - In settings/footer for changes
- [ ] Persist to localStorage + cookie (for server access)

#### 3.3 Consent Banner UX
```
┌─────────────────────────────────────────────────────────────────────┐
│  We use cookies to improve your experience and fix bugs.            │
│                                                                      │
│  [Accept All]  [Customize]  [Essential Only]                        │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.4 Customize Modal
```
┌─────────────────────────────────────────────────────────────────────┐
│  Privacy Preferences                                          [X]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ☑ Essential (Required)                                             │
│    Security and core functionality. Cannot be disabled.             │
│                                                                      │
│  ☑ Functional                                                       │
│    Help us fix bugs by reporting errors you encounter.              │
│                                                                      │
│  ☑ Analytics                                                        │
│    Help us understand which features are most useful.               │
│                                                                      │
│  ☐ Diagnostic                                                       │
│    Share detailed session info to help debug issues.                │
│                                                                      │
│                                          [Save Preferences]         │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Phase 4: Support & Developer Tools

#### 4.1 Cloud Logging Setup
- [ ] Create log-based metrics for key events
- [ ] Set up log sinks for long-term storage (optional BigQuery)
- [ ] Configure log retention (30 days default)

#### 4.2 Cloud Monitoring Dashboards

**Support Dashboard:**
- Active sessions (last 24h)
- Error rate by type
- Recent errors with session lookup
- Search by session ID

**Developer Dashboard:**
- Error trends over time
- Top errors by frequency
- Performance metrics (API latency, page load)
- Feature usage heatmap

#### 4.3 Alerts
- [ ] Configure notification channels (Email primary, Slack optional)
- [ ] Alert on error spike (>10x normal rate)
- [ ] Alert on high latency (p95 > 5s)
- [ ] Alert on new error types

#### 4.4 Support Workflow
```
1. User reports issue
2. User provides session ID (shown in UI footer or settings)
3. Support searches Cloud Logging: sessionId="abc-123"
4. See full timeline: page loads, clicks, errors, API calls
5. Correlate with server logs using same session ID
```

---

### Phase 5: Privacy & Compliance

#### 5.1 Privacy Policy Updates
- [ ] Document all data collected
- [ ] Explain each consent category
- [ ] Describe retention periods
- [ ] Provide contact for data requests

#### 5.2 Data Handling
- [ ] PII sanitization based on consent level
- [ ] No DID/handle in logs without diagnostic consent
- [ ] IP address redaction in Cloud Run
- [ ] Automatic log expiration

#### 5.3 User Rights
- [ ] Show Support ID in UI (see Support ID section below)
- [ ] Allow consent changes anytime
- [ ] Document data deletion process

---

## Support ID (User-Facing Session ID)

The internal `sessionId` is presented to users as **"Support ID"** to clearly communicate its purpose.

### Terminology
| Context | Term Used |
|---------|-----------|
| Code / Logs | `sessionId` |
| User-facing UI | "Support ID" |
| Support docs | "Support ID" |

### UI Placement

**A. Footer (always visible)**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                         [App Content]                                │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  © 2025 BlockSky    Privacy    Support ID: a1b2c3d4   [?]           │
└─────────────────────────────────────────────────────────────────────┘
```

Clicking [?] shows tooltip/popover:
```
┌─────────────────────────────────────────┐
│  Your Support ID helps our team         │
│  troubleshoot issues you report.        │
│                                         │
│  It's anonymous and resets when you     │
│  close the app.                         │
│                                         │
│  [Copy ID]                              │
└─────────────────────────────────────────┘
```

**C. Error Screens (contextual)**
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                      │
│     ⚠️  Something went wrong                                        │
│                                                                      │
│     We couldn't complete the blocking operation.                    │
│                                                                      │
│     If this keeps happening, contact support with                   │
│     your Support ID: a1b2c3d4  [Copy]                               │
│                                                                      │
│     [Try Again]   [Contact Support]                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Components Needed
- [ ] `SupportIdFooter` - Footer element with ID and help tooltip
- [ ] `SupportIdDisplay` - Reusable ID + copy button component
- [ ] Update error boundary to include Support ID
- [ ] Update any existing error UI to include Support ID

---

## File Structure

```
src/
├── components/
│   ├── telemetry/
│   │   ├── consent-banner.tsx      # Initial consent prompt
│   │   ├── consent-modal.tsx       # Detailed preferences
│   │   ├── consent-settings.tsx    # Settings page section
│   │   ├── error-boundary.tsx      # React error boundary
│   │   ├── support-id-footer.tsx   # Footer with Support ID
│   │   └── support-id-display.tsx  # Reusable ID + copy component
│   └── ui/
│       └── ... (existing)
├── hooks/
│   ├── use-auth.ts (existing)
│   ├── use-telemetry.ts            # Telemetry hook
│   └── use-consent.ts              # Consent state hook
├── lib/
│   ├── telemetry/
│   │   ├── client.ts               # Telemetry client class
│   │   ├── types.ts                # Event types
│   │   ├── consent.ts              # Consent management
│   │   └── auto-capture.ts         # Automatic event capture
│   └── logger.ts (existing)
├── contexts/
│   └── telemetry-context.tsx       # React context provider
server/
├── api/
│   ├── block-stream.ts (existing)
│   └── telemetry.ts                # Telemetry ingestion endpoint
```

---

## Event Catalog

### Essential Events (No opt-out)
| Event | Trigger | Data |
|-------|---------|------|
| `auth.login` | User logs in | method (oauth/password) |
| `auth.logout` | User logs out | - |
| `auth.error` | Auth failure | error type |
| `security.suspicious` | Unusual activity | type |

### Functional Events (Opt-out available)
| Event | Trigger | Data |
|-------|---------|------|
| `error.client` | JS error | message, stack, component |
| `error.api` | API error | endpoint, status, message |
| `performance.pageload` | Page loads | duration, LCP, FID, CLS |
| `performance.api` | API call completes | endpoint, duration |

### Analytics Events (Opt-out available)
| Event | Trigger | Data |
|-------|---------|------|
| `page.view` | Navigation | path |
| `click.button` | Button click | button name, context |
| `feature.use` | Feature used | feature name |
| `block.start` | Blocking started | type (followers/following), count |
| `block.complete` | Blocking finished | count, duration |
| `block.cancel` | User cancels | count completed |

### Diagnostic Events (Opt-in only)
| Event | Trigger | Data |
|-------|---------|------|
| `session.journey` | Aggregated actions | action sequence |
| `debug.state` | On error | relevant app state |
| `user.context` | With consent | DID (hashed), handle |

---

## Acceptance Criteria

### Phase 1 Complete When:
- [ ] Session ID generated and passed to all requests
- [ ] `/api/telemetry` accepts and logs events
- [ ] Events visible in Cloud Logging
- [ ] Server logs include session ID

### Phase 2 Complete When:
- [ ] `TelemetryProvider` wraps app
- [ ] Errors automatically captured
- [ ] `telemetry.track()` works throughout app
- [ ] Events batched and sent efficiently
- [ ] Support ID shown in footer with help tooltip
- [ ] Support ID shown on error screens with copy button

### Phase 3 Complete When:
- [ ] Consent banner shows on first visit
- [ ] User can customize preferences
- [ ] Preferences persisted and respected
- [ ] Events filtered based on consent

### Phase 4 Complete When:
- [ ] Support dashboard shows session lookup
- [ ] Developer dashboard shows error trends
- [ ] Alerts configured for error spikes
- [ ] Documentation for support workflow

### Phase 5 Complete When:
- [ ] Privacy policy updated
- [ ] PII properly sanitized
- [ ] Session ID visible to users
- [ ] Data retention configured

---

## Estimated Scope

| Phase | Components | Complexity |
|-------|------------|------------|
| Phase 1 | 4 | Medium |
| Phase 2 | 5 | Medium |
| Phase 3 | 4 | Low |
| Phase 4 | 4 | Medium (GCP config) |
| Phase 5 | 3 | Low |

---

## Data Governance

### Philosophy

> **Collect what you need, alert in real-time, discard aggressively.**

Good alerting reduces the need for long retention. If you're notified of issues immediately, you don't need months of logs to find problems after the fact.

### Retention Policies

| Data Type | Retention | Rationale |
|-----------|-----------|-----------|
| **Error logs** | 30 days | Time to investigate, fix, and verify |
| **Analytics events** | 7 days | Aggregate daily, then discard raw |
| **Performance metrics** | 7 days | Spot trends, create alerts, discard |
| **Debug/diagnostic** | 1-3 days | Active debugging only |
| **Aggregated summaries** | 90 days | Keep rollups, not raw data |

### Log Routing Strategy

```
Cloud Logging → Log Router
  │
  ├─► errors-bucket (30 days)
  │     Filter: severity >= ERROR
  │
  ├─► analytics-bucket (7 days)
  │     Filter: jsonPayload.category = "analytics"
  │
  ├─► debug-bucket (1 day) [dev/stage only]
  │     Filter: severity = DEBUG
  │
  └─► aggregation-sink → BigQuery (optional)
        Filter: daily rollup job
```

### Alerting as Retention Replacement

Instead of keeping logs forever "just in case," alert on issues in real-time:

| Alert | Trigger | Action |
|-------|---------|--------|
| Error spike | >10x baseline in 5 min | Email + Slack |
| New error type | First occurrence of error signature | Email |
| High latency | p95 > 3s for 5 min | Email |
| Auth failures | >20 in 1 min | Email (possible attack) |
| Rate limit hits | >5 users/hour hitting limits | Slack (capacity issue) |

**Result:** Catch issues live, investigate with fresh logs, don't hoard data.

### Aggregation Strategy

Keep summaries, discard details:

```
Raw events (7 days):
  { type: "click", button: "block_followers", timestamp: "..." }
  { type: "click", button: "block_followers", timestamp: "..." }
  { type: "click", button: "block_following", timestamp: "..." }

Daily rollup (90 days):
  { date: "2026-01-22", clicks: { block_followers: 150, block_following: 89 } }
```

### Sampling at Scale

If traffic explodes, sample instead of logging everything:

| Traffic Level | Sampling Rate | Notes |
|---------------|---------------|-------|
| < 100k events/day | 100% | Log everything |
| 100k - 1M events/day | 25% | Random sample |
| > 1M events/day | 10% | Statistically significant |

Errors always logged at 100% regardless of sampling.

### Privacy + Governance Combined

| Principle | Implementation |
|-----------|----------------|
| **Minimize collection** | Only log what's needed for the data category |
| **Minimize retention** | Aggressive TTLs per data type |
| **Minimize access** | IAM roles scoped to need |
| **Maximize alerting** | Real-time beats historical digging |

### Implementation Tasks

- [ ] Create separate log buckets with different retention periods
- [ ] Configure log router with filters for each bucket
- [ ] Set up daily aggregation job (Cloud Scheduler + Cloud Function)
- [ ] Configure alert policies in Cloud Monitoring
- [ ] Document retention policy for privacy policy page

---

## Resolved Questions

1. ~~**Support ID visibility**~~ - ✅ Footer + error screens
2. ~~**Consent defaults**~~ - ✅ ALL categories ON by default, user can toggle each off
3. ~~**BigQuery export**~~ - ✅ Start with 30-day Cloud Logging, add BigQuery later if needed
4. ~~**Alert recipients**~~ - ✅ Email (primary), Slack (optional/future)
5. ~~**Support access**~~ - ✅ IAM roles: logging.viewer, monitoring.viewer, errorreporting.viewer

---

## Next Steps

1. Review and approve this plan
2. Decide on questions above
3. Start Phase 1 implementation
