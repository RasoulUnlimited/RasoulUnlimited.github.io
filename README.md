# Rasoul Unlimited - [rasoulunlimited.ir](https://rasoulunlimited.ir)

![Homepage screenshot](assets/images/Homepage-screenshot2.png)

> A modern personal website powered by **GitHub Pages** and **Cloudflare**

[Read this README in Persian (Farsi)](README-fa.md)

This repository contains the source code and content for the personal website of **Mohammad Rasoul Sohrabi**. It is a static site built with Node.js and Gulp, published through GitHub Pages, and delivered via Cloudflare. The project focuses on fast loading, clear bilingual content (FA/EN), and strong machine-readable identity and SEO metadata.

**Contents**
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Testing and Quality](#testing-and-quality)
- [Deployment](#deployment)
- [Security](#security)
- [Structured Data and AI Assets](#structured-data-and-ai-assets)
- [Contributing](#contributing)
- [License](#license)

## Overview

Rasoul Unlimited is a bilingual personal site that presents projects, writing, and profile information in Persian and English. Pages are statically served for reliability and speed, with **GitHub Pages** as origin hosting and **Cloudflare** for delivery and edge behavior. The repository also includes structured data files to improve search visibility and identity verification across platforms.

## Quick Start

```bash
npm install
npm run build
npm run start
```

Then open <http://127.0.0.1:8080>.

## Development Workflow

- Use `npm run dev` for day-to-day development (runs asset watch plus local server together).
- Use `npm run start` when you only need a static preview server without watch mode.
- Use `npm run build` before release checks or deployment to regenerate optimized assets.

## Project Structure

```text
assets/        # CSS, JavaScript, images, and data assets
cloudflare/    # Cloudflare Worker source
config/        # Project-level runtime/build configuration
en/            # English pages
faq/           # Persian FAQ pages
includes/      # Reusable shared HTML blocks
press-kit/     # Media kit and press resources
projects/      # Project content pages
schema/        # JSON-LD and schema resources
scripts/       # Utility scripts (for example SEO verification)
tests/         # Playwright E2E suites
```

## Testing and Quality

Use the canonical scripts from `package.json`:

```bash
npm run lint
npm run test:strict
npm run test:e2e
npm run seo:verify
npm run audit:prod
```

For complete test workflows, environment variables, E2E modes, and release checklist, see [TESTING.md](TESTING.md).

Note: `npm run audit` executes `npm audit fix` and may modify `package-lock.json`.

## Deployment

The site is published via **GitHub Pages** and served through **Cloudflare**.

1. Ensure `CNAME` matches the target domain.
2. Point Cloudflare DNS records to GitHub Pages.
3. Deploy and route the Worker from [`cloudflare/worker.js`](cloudflare/worker.js).
4. Push to GitHub and allow cache propagation at the edge.

The repository also includes `sw.js` for offline/cache behavior on pages that register the Service Worker.

## Security

Security contact, reporting process, scope, and disclosure policy are documented in [SECURITY.md](SECURITY.md).

## Structured Data and AI Assets

Core machine-readable assets:

- [`foaf.rdf`](foaf.rdf)
- [`manifest.json`](manifest.json)
- [`humans.txt`](humans.txt)
- [`ai.txt`](ai.txt)
- [`ai/meta.json`](ai/meta.json)
- [`ai/answer-kit.json`](ai/answer-kit.json)
- [`ai/resource-map.json`](ai/resource-map.json)

Keep these files in sync when claims or identity details change. After editing AI payloads, update integrity/hash references in `ai/resource-map.json`.

## Contributing

For setup details, commit conventions, and pull request workflow, use [CONTRIBUTING.md](CONTRIBUTING.md). All contributors are expected to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Content is licensed under the [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License](https://creativecommons.org/licenses/by-nc-nd/4.0/). Third-party licensing details are listed in [NOTICE](NOTICE).

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
