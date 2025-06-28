# rasoulunlimited.ir

## Project description and purpose
A minimal personal site for Mohammad Rasoul Sohrabi (Rasoul Unlimited) built with GitHub Pages. The project showcases work, writing, and contact information in both Persian and English.

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
The `build` script compiles and minifies static assets using Gulp. Generated
`*.min.css` and `*.min.js` files are not tracked in Git, so run this command
before deploying locally or rely on the automated GitHub Actions workflow.

## Deployment notes
The site is hosted on **GitHub Pages** and served through **Cloudflare** for improved performance and security. A GitHub Actions workflow automatically builds the minified assets and deploys the site on every push to `main`. Update the `CNAME` file when changing the custom domain.

## Cloudflare Worker
A small Worker inspects the `User-Agent` header of each request. When a request
comes from **Googlebot**, **Twitterbot**, or **Facebook**, the Worker injects a
secondary JSON‑LD snippet and adds an `X-Crawler-Handled` header to the response.

### Deployment
1. Open the Cloudflare dashboard and create a new **Worker**.
2. Copy the code from [`cloudflare/worker.js`](cloudflare/worker.js) into the editor.
3. Assign the Worker to your GitHub Pages domain and deploy.


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
- Include additional details in the body when a change requires more

## License
All content is provided under the [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License](https://creativecommons.org/licenses/by-nc-nd/4.0/). See the [LICENSE](LICENSE) file for details.
