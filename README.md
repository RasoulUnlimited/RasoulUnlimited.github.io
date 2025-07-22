# Rasoul Unlimited – [rasoulunlimited.ir](https://rasoulunlimited.ir)

![Homepage screenshot](assets/images/Homepage-screenshot2.png)

> A modern personal website powered by **GitHub Pages** and **Cloudflare**

[راهنمای فارسی](README-fa.md)

## Table of Contents

- [Overview](#overview)
- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Build instructions](#build-instructions)
- [Local development](#local-development)
- [Deployment notes](#deployment-notes)
- [Cloudflare Worker](#cloudflare-worker)
- [Structured data and profiles](#structured-data-and-profiles)
- [Resources](#resources)
- [Contribution guidelines](#contribution-guidelines)
- [License](#license)


## Overview

Rasoul Unlimited is the personal website of **Mohammad Rasoul Sohrabi**. Designed with a minimal, elegant aesthetic, it highlights his work and writing in both Persian and English. Each page is statically generated with Node and Gulp, then hosted on **GitHub Pages** and served through **Cloudflare** for improved speed and security. The architecture is built to load quickly and provide a smooth experience. The mission is to present Rasoul's expertise professionally and simply, letting the content speak for itself.

Key features:

- Minimal and elegant design with optional dark mode
- Fully bilingual (Persian and English) to reach a wider audience
- Hosted on GitHub Pages and accelerated via Cloudflare for speed and security
- Structured data (JSON‑LD) for stronger SEO and knowledge graph coverage
- [FOAF profile](foaf.rdf) plus other identity links for knowledge graphs
- Cloudflare Worker that injects crawler‑specific JSON‑LD and adds caching
- Strict Content‑Security‑Policy enforced through Cloudflare (see example policy)

## Quick start

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Build optimized assets with `npm run build`.
4. Preview locally using `npx serve -l 8080 .` or any static server.

## Design philosophy

The interface follows a minimal and elegant approach so that content stands out
without distractions. Animations and scripts are kept light to ensure a fast,
smooth experience across devices. Every element and motion has a purpose — to
improve clarity, usability, or engagement — rather than decoration.

## Project structure

```
assets/        # CSS, images and JavaScript
cloudflare/    # Worker code for dynamic headers
en/            # English pages
faq/           # Persian FAQ
includes/      # Shared header and footer snippets
press-kit/     # Media resources and bio files
projects/      # Project descriptions
schema/        # Structured data in JSON-LD
```


Content‑Security‑Policy example:

```
  default-src 'self' blob:;
  script-src 'self' https://cdn.tailwindcss.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://static.cloudflareinsights.com https://giscus.app 'nonce-RasoulCSP';
  style-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net 'nonce-RasoulCSP';
  style-src-attr 'self' 'nonce-RasoulCSP';
  style-src-elem 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://giscus.app;
  font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
  img-src 'self' data: https://avatars.githubusercontent.com;
  connect-src 'self' https://static.cloudflareinsights.com https://giscus.app https://api.github.com https://orcid.org https://about.me https://www.researchgate.net https://www.linkedin.com https://github.com;
  frame-src https://giscus.app;
  object-src 'none';
  base-uri 'self';
  form-action https://formspree.io 'self';
  frame-ancestors 'self';
```

## Prerequisites

- **Node.js** 18 or later
- **Gulp** 5 (requires the CLI; install with `npm install gulp-cli` or run via `npx gulp`)

## Build instructions

```bash
npm install
# optional: install Gulp CLI if you want the `gulp` command
npm install gulp-cli
npm run build
```

The `build` script compiles and minifies static assets using Gulp.

## Local development

After running the build, you can preview the site locally with any static server.

```bash
npx serve -l 8080 .
# or
python3 -m http.server 8080
```

Then open <http://localhost:8080> in your browser.

## Deployment notes

The site is hosted on **GitHub Pages** and served through **Cloudflare** for improved performance and security.

Deployment steps:

1. Edit the `CNAME` file so it matches your domain.
2. Update Cloudflare DNS **A/AAAA** records to point to GitHub Pages.
3. Adjust the Worker route and security headers for the new domain.
4. Push changes to GitHub; Cloudflare will serve the updated pages from cache.

Whenever the domain or any external resources change, review the `Content‑Security‑Policy` to ensure it still references only the required sources.

## Cloudflare Worker

A small Worker inspects the `User-Agent` header of each request. When a request
comes from **Googlebot**, **Twitterbot**, or **Facebook**, the Worker injects a
secondary JSON‑LD snippet and adds an `X-Crawler-Handled` header to the response.
It also sets a `Cache-Control` header so pages can be served from Cloudflare's
edge cache for several minutes.

### Deployment

1. Open the Cloudflare dashboard and create a new **Worker**.
2. Copy the code from [`cloudflare/worker.js`](cloudflare/worker.js) into the editor.
3. Assign the Worker to your GitHub Pages domain and deploy.

The Worker also adds a `Cache-Control: public, max-age=600` header so
responses are cached for up to 10 minutes.

## Structured data and profiles

- [`foaf.rdf`](foaf.rdf) – FOAF profile in RDF
- [`manifest.json`](manifest.json) – Web app manifest
- [`humans.txt`](humans.txt) – Project and contact details

Additional identity links: [GitHub](https://github.com/RasoulUnlimited), [ORCID](https://orcid.org/0009-0004-7177-2080), [LinkedIn](https://www.linkedin.com/in/rasoulunlimited).

## Ownership verification

To confirm that the site and its social profiles are officially connected, each
page includes a series of `rel="me"` links pointing to Rasoul's accounts on
GitHub, LinkedIn, ORCID and other platforms. These profiles return the favour by
linking back to `https://rasoulunlimited.ir`, forming a clear loop of ownership.
The accompanying [FOAF profile](foaf.rdf) lists the same identities in RDF
format. Reviewers, such as those evaluating an Instagram verification request,
can check these reciprocal links to validate that the domain is under Rasoul's
control.

The site also exposes a file at [`.well-known/discord`](.well-known/discord) for
Discord's domain verification. Discord provides a unique token which must be
served from this exact path as a plain‑text file. When you submit the domain to
Discord, it fetches the file and compares the token to confirm control of
`rasoulunlimited.ir`. According to Discord's documentation, the filename
`discord.html` is not required—the platform specifically looks for the
`.well-known/discord` endpoint, so this repository follows that convention.

## Resources

For a quick reference to all main pages and social links, see [links.txt](links.txt).

## Contribution guidelines

Contribution instructions, including commit message conventions, are summarized in [CONTRIBUTING.md](CONTRIBUTING.md). To keep the history clear and useful, please write descriptive commit messages that quickly explain the intent of each change.

- Summarize the change in a short sentence using the imperative mood (e.g., "Add contact form" or "Fix build script").
- Avoid generic subjects like "Update" or "Fix" without context.
- Limit the summary line to around 50 characters when possible.
- Include additional details in the body when a change requires more context or explanation.

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions

Feel free to contact me via email with any questions. The [humans.txt](humans.txt) file lists the developer's email address and profiles.

## License

All content is released under the
[Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International
License](https://creativecommons.org/licenses/by-nc-nd/4.0/). You may copy and
redistribute the material so long as you give appropriate credit, but commercial
use and derivative works are not allowed. Licenses for third-party code are
documented in the new [NOTICE](NOTICE) file. For commercial or derivative
requests, please contact `rasoul.unlimited@gmail.com`.

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
