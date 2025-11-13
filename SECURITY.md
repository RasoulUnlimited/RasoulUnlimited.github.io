# Security Policy

We take the security of this website and its infrastructure seriously. If you discover a vulnerability, we ask that you report it responsibly so we can investigate and resolve the issue without putting users at risk.

---

## Reporting a Vulnerability

If you believe you’ve found a security issue, please follow these steps:

1. **Email us** at **rasoul.unlimited@gmail.com** with a clear and concise summary of the issue.
2. If your report contains sensitive details or exploit information, **encrypt your message** using our [PGP public key](assets/keys/rasoulunlimited_pgp.asc).  
   - The same key is also available on [Keybase](https://keybase.io/rasoulunlimited).
3. Include as much relevant information as possible, for example:
   - A description of the vulnerability and potential impact
   - Steps to reproduce (including URLs, parameters, example payloads, etc.)
   - Any logs, screenshots, or proof-of-concept snippets that help us verify the issue
4. Give us reasonable time to investigate, fix, and deploy a patch **before** disclosing details publicly.

We will review all reports in good faith and do our best to respond as quickly as we can.

---

## Coordinated Disclosure

By reporting a vulnerability to us:

- You agree **not to publicly disclose** technical details of the issue until we have:
  - Confirmed the report, and  
  - Either deployed a fix or explicitly agreed on a disclosure timeline with you.
- We ask that you do **not** access, modify, or delete data that does not belong to you while demonstrating the issue.
- Do not perform actions that could degrade the service, cause denial-of-service, or negatively impact other users.

We deeply appreciate researchers who follow coordinated disclosure practices and help us improve the security of the ecosystem.

---

## Scope

This policy primarily covers:

- The main website: `https://rasoulunlimited.ir`
- Associated public assets and endpoints under this domain

For third-party services (hosting platforms, CDNs, analytics providers, etc.), please also consider their respective security policies and responsible disclosure programs.

---

## Out of Scope

While we welcome all reports, the following are generally **not considered** security vulnerabilities:

- Clickjacking or frameable content on non-sensitive pages
- Use of outdated libraries without a demonstrated, exploitable impact
- Missing security headers that do not lead to a practical exploit
- Self–XSS (where the attacker is also the victim)
- Issues that only arise on outdated or unsupported browsers

However, if you’re unsure whether something is in scope, feel free to contact us anyway — we’d rather you report than ignore a potential issue.

---

## Additional Information

Full and up-to-date guidelines can be found on our public security policy page:

👉 [https://rasoulunlimited.ir/security.html](https://rasoulunlimited.ir/security.html)

Thank you for helping us keep users and infrastructure safe.
