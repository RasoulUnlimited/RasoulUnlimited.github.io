# Security Policy

We take the security of this website and its infrastructure seriously.  
If you discover a vulnerability, we ask that you report it responsibly so we can investigate and resolve the issue without putting users at risk.

---

## Contact & Primary Channel

If you believe you’ve found a security issue, please contact:

- **Email (preferred):** `rasoul.unlimited@gmail.com`
- **Subject line:** `Security Report – <short description>`

We review all reports in good faith and will do our best to respond as quickly as possible.

---

## Reporting a Vulnerability

When submitting a report, please include as much detail as you reasonably can:

1. **Summary of the issue**  
   A clear and concise description of the vulnerability and its potential impact.

2. **Steps to reproduce**  
   - Exact URLs, parameters, and HTTP methods  
   - Example payloads or request/response samples  
   - Any required authentication or roles

3. **Environment & context**  
   - Affected domain or endpoint  
   - Browser / client / OS (if relevant)  
   - Any special configuration assumptions

4. **Evidence**  
   - Logs, screenshots, or short proof-of-concept snippets  
   - Any indicators that show business or security impact

5. **Your contact details**  
   So we can follow up with clarifying questions and share status updates.

Please give us reasonable time to investigate, fix, and deploy a patch **before** sharing any details publicly.

---

## Encrypted / Sensitive Reports

If your report contains sensitive information (for example: exploit details, active tokens, or non-public data), please encrypt your message:

- **PGP public key (direct download):** [`assets/keys/rasoulunlimited_pgp.asc`](assets/keys/rasoulunlimited_pgp.asc)  
- **PGP key on Keybase:** <https://keybase.io/rasoulunlimited>

After encrypting, send the report to:

- `rasoul.unlimited@gmail.com` (with the encrypted body or attachment)

---

## Coordinated Vulnerability Disclosure

By reporting a vulnerability to us, you agree to follow a **coordinated disclosure** process:

- Please **do not publicly disclose** technical details of the issue until we have:
  - Acknowledged the report, and  
  - Either deployed a fix or explicitly agreed on a disclosure timeline with you.
- Do **not** intentionally access, modify, or delete data that does not belong to you.
- Do **not** perform testing that could:
  - Degrade the service,  
  - Cause denial-of-service, or  
  - Negatively impact other users.

We strongly value and appreciate researchers who follow coordinated disclosure practices and help us improve the security of the ecosystem.

---

## Scope

This policy primarily covers:

- The main website: `https://rasoulunlimited.ir`
- The `www` subdomain: `https://www.rasoulunlimited.ir`
- Public assets and endpoints hosted under these domains

For third-party services (hosting platforms, CDNs, analytics providers, form endpoints, etc.), please also respect and follow their own security policies and disclosure programs.

If you are unsure whether a specific target is in scope, feel free to ask.

---

## Out of Scope (Examples)

While we welcome all good-faith reports, the following examples are **generally not considered** security vulnerabilities for this program:

- Clickjacking / framing issues on **non-sensitive** pages
- Use of outdated libraries **without a demonstrable, exploitable impact**
- Missing or optional security headers that do not lead to a practical exploit
- **Self-XSS** (where the attacker is also the victim)
- Issues that only affect very old or unsupported browsers
- Best-practice or “hardening” suggestions without a clear security impact

That said, if you are unsure whether something is in scope, it is still better to contact us than to ignore a potential issue.

---

## Rules of Engagement

To keep both users and you safe, please:

- Perform **only non-destructive** testing.
- Avoid any kind of:
  - Denial-of-service (DoS / DDoS)  
  - Excessive automated scanning, fuzzing, or traffic generation  
  - Spamming contact forms or other user-facing features
- Use test data where possible and avoid accessing real user data.
- Immediately stop testing and contact us if you encounter:
  - Production data you did not intend to access, or  
  - A situation that could harm availability or integrity.

You are responsible for ensuring that all of your activities comply with applicable laws and regulations.

---

## Response Targets

These are **non-binding goals**, not guarantees, but we aim to:

- **Acknowledge** valid reports within **48 hours**.
- **Provide an initial assessment** (validity, severity, rough plan) within **7 days**.
- **Deploy a fix or share a mitigation plan** for confirmed issues within **30 days**, depending on complexity and impact.

Where appropriate, and if you wish, we may **credit you** in a public acknowledgments section once the issue is resolved.

---

## Canonical Policy & Further Information

The canonical, machine-readable version of this security contact policy is published at:

- `/.well-known/security.txt` → <https://rasoulunlimited.ir/.well-known/security.txt>

The human-readable, full security policy pages are available at:

- Persian: <https://rasoulunlimited.ir/security.html>  
- English: <https://rasoulunlimited.ir/en/security.html>

Thank you for helping to keep users and infrastructure safe.
