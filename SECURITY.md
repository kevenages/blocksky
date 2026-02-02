# Security Policy

## Supported Versions

Only the most recent major release of BlockSky is supported with security updates.

| Version  | Supported |
| -------- | --------- |
| **v3.x** | ✅ Yes     |
| v2.x     | ❌ No      |
| v1.x     | ❌ No      |
| < v1.0   | ❌ No      |

If you are running an unsupported version, please upgrade before reporting a security issue.

---

## Reporting a Vulnerability

We take security seriously and appreciate responsible disclosure.

### How to Report

Please report security vulnerabilities **privately** by emailing:

**📧 [support@blocksky.app](mailto:support@blocksky.app)**

Do **not** open a public GitHub issue or post details on social media.

### What to Include

To help us investigate quickly, please include:

* A clear description of the vulnerability
* Steps to reproduce (if applicable)
* Potential impact (data exposure, auth bypass, DoS, etc.)
* Any relevant screenshots, logs, or proof-of-concept code

### What to Expect

* **Acknowledgement:** within **72 hours**
* **Status updates:** as investigation progresses
* **Fix timeline:** depends on severity, but critical issues are prioritized
* **Disclosure:** we may coordinate disclosure once a fix is deployed

### Scope Notes

* OAuth authentication is handled directly by Bluesky; credentials never touch BlockSky servers
* We do **not** consider rate-limit behavior, expected API constraints, or user-initiated mass blocking to be vulnerabilities
* Social engineering, phishing, or issues outside BlockSky’s codebase are out of scope

---

## Safe Harbor

We support good-faith security research.
If you:

* Make a good-faith effort to avoid privacy violations
* Do not exploit the issue beyond proof-of-concept
* Give us reasonable time to fix the issue before disclosure

We will not pursue legal action against you.

---
