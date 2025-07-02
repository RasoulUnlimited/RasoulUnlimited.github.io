# Rasoul Unlimited – [rasoulunlimited.ir](https://rasoulunlimited.ir)

![Homepage screenshot](assets/images/Homepage-screenshot.png)

> A modern personal website powered by **GitHub Pages** and **Cloudflare**

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Build instructions](#build-instructions)
- [Local development](#local-development)
- [Deployment notes](#deployment-notes)
- [Cloudflare Worker](#cloudflare-worker)
- [Structured data and profiles](#structured-data-and-profiles)
- [Contribution guidelines](#contribution-guidelines)
- [License](#license)


## Overview

Rasoul Unlimited is the personal website of **Mohammad Rasoul Sohrabi**. It is a
clean, fast loading site that highlights his work and writing in both Persian
and English. The pages are fully static, built with Node and Gulp, then
deployed on **GitHub Pages** and accelerated through **Cloudflare** for global
performance and security.

Key features:

- Minimal and elegant design with optional dark mode
- Fully bilingual (Persian and English) to reach a wider audience
- Hosted on GitHub Pages and accelerated via Cloudflare for speed and security
- Structured data (JSON‑LD) for stronger SEO and knowledge graph coverage
- [FOAF profile](foaf.rdf) plus other identity links for knowledge graphs
- Cloudflare Worker that injects crawler‑specific JSON‑LD and adds caching
- Strict Content‑Security‑Policy enforced through Cloudflare (see example policy)

## Design philosophy

The interface follows a minimal and elegant approach so that content stands out
without distractions. Animations and scripts are kept light to ensure a fast,
smooth experience across devices. Every visual element supports clarity and
usability rather than decoration.

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

The site is hosted on **GitHub Pages** and served through **Cloudflare** for improved performance and security. The `CNAME` file defines the custom domain; editing this file updates the domain that GitHub Pages responds to. After changing it, make sure your Cloudflare DNS records point the domain to GitHub Pages.

When a domain change occurs, update the route for the Cloudflare Worker so it attaches to the new hostname. Review the security headers injected by Cloudflare—including the `Content‑Security‑Policy`—and adjust any domain‑specific directives accordingly.

## Cloudflare Worker

A small Worker inspects the `User-Agent` header of each request. When a request
comes from **Googlebot**, **Twitterbot**, or **Facebook**, the Worker injects a
secondary JSON‑LD snippet and adds an `X-Crawler-Handled` header to the response.

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

## Contribution guidelines

To keep the history clear and useful, please write descriptive commit messages that quickly explain the intent of each change.

- Summarize the change in a short sentence using the imperative mood (e.g., "Add contact form" or "Fix build script").
- Avoid generic subjects like "Update" or "Fix" without context.
- Limit the summary line to around 50 characters when possible.
- Include additional details in the body when a change requires more context or explanation.

## License

All content is provided under the [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License](https://creativecommons.org/licenses/by-nc-nd/4.0/). See the [LICENSE](LICENSE) file for details.
