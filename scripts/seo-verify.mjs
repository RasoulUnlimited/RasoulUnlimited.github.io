import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DOMAIN = "https://rasoulunlimited.ir";
const IGNORED_DIRS = new Set(["node_modules", ".git"]);

function stripComments(input) {
  return input.replace(/<!--[\s\S]*?-->/g, "");
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.href;
  } catch {
    return "";
  }
}

function toAbsoluteUrl(raw, filePath) {
  if (!raw) return "";
  const value = raw.trim();
  if (
    !value ||
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:") ||
    value.startsWith("javascript:") ||
    value.startsWith("data:")
  ) {
    return "";
  }
  if (value.includes("${")) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${DOMAIN}${value}`;

  const fromDir = path
    .dirname(filePath)
    .split(path.sep)
    .join("/");
  return `${DOMAIN}/${fromDir === "." ? "" : `${fromDir}/`}${value}`;
}

async function walkHtmlFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkHtmlFiles(full)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function parseFirst(regex, text) {
  const match = regex.exec(text);
  return match ? match[1].trim() : "";
}

function parseAll(regex, text) {
  return [...text.matchAll(regex)].map((m) => m.slice(1));
}

function htmlToExpectedUrl(filePath) {
  const rel = path.relative(ROOT, filePath).split(path.sep).join("/");
  if (rel === "index.html") return `${DOMAIN}/`;
  if (rel.endsWith("/index.html")) {
    return `${DOMAIN}/${rel.slice(0, -"/index.html".length)}/`;
  }
  return `${DOMAIN}/${rel}`;
}

async function fetchHead(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    return {
      url,
      status: res.status,
      location: res.headers.get("location") || "",
    };
  } catch (err) {
    return {
      url,
      status: -1,
      location: String(err?.message || "network_error"),
    };
  }
}

async function main() {
  const htmlFiles = await walkHtmlFiles(ROOT);
  const issues = [];

  const pages = [];
  for (const filePath of htmlFiles) {
    const raw = await fs.readFile(filePath, "utf8");
    const text = stripComments(raw);

    const canonical =
      parseFirst(
        /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
        text
      ) ||
      parseFirst(
        /<link\s+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i,
        text
      );

    const robots = parseFirst(
      /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i,
      text
    ).toLowerCase();

    const noindex = robots.includes("noindex");
    const relPath = path.relative(ROOT, filePath).split(path.sep).join("/");
    const isInclude = relPath.startsWith("includes/");
    const expectedUrl = htmlToExpectedUrl(filePath);
    const hreflangs = parseAll(
      /<link\s+rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["']/gi,
      text
    ).map(([lang, href]) => ({ lang: lang.toLowerCase(), href }));

    const links = parseAll(
      /(?:href|src)\s*=\s*["']([^"']+)["']/gi,
      text
    )
      .map(([value]) => normalizeUrl(toAbsoluteUrl(value, relPath)))
      .filter(Boolean)
      .filter((url) => url.startsWith(DOMAIN));

    const jsonLdBlocks = parseAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      text
    );

    for (let i = 0; i < jsonLdBlocks.length; i += 1) {
      const body = jsonLdBlocks[i][0].trim();
      if (!body) continue;
      try {
        JSON.parse(body);
      } catch (err) {
        issues.push(
          `[jsonld] ${relPath} block #${i + 1} invalid JSON: ${String(
            err?.message || err
          )}`
        );
      }
    }

    if (!isInclude && !noindex && !canonical) {
      issues.push(`[canonical] ${relPath} missing canonical tag`);
    }

    pages.push({
      relPath,
      canonical,
      expectedUrl,
      hreflangs,
      links,
      isInclude,
      noindex,
    });
  }

  const indexable = pages.filter((p) => !p.isInclude && !p.noindex);
  const canonicalSet = new Map(
    indexable
      .filter((p) => p.canonical)
      .map((p) => [normalizeUrl(p.canonical), p])
  );

  for (const page of indexable) {
    if (!page.canonical) continue;
    const can = normalizeUrl(page.canonical);
    const exp = normalizeUrl(page.expectedUrl);
    if (can && exp && can.replace(/\/$/, "") !== exp.replace(/\/$/, "")) {
      issues.push(
        `[canonical] ${page.relPath} canonical (${page.canonical}) does not match page URL (${page.expectedUrl})`
      );
    }
  }

  for (const page of indexable) {
    const source = normalizeUrl(page.canonical || page.expectedUrl);
    for (const alt of page.hreflangs) {
      const target = normalizeUrl(alt.href);
      const targetPage = canonicalSet.get(target);
      if (!targetPage || !source) continue;
      const reciprocal = targetPage.hreflangs.some(
        (entry) => normalizeUrl(entry.href) === source
      );
      if (!reciprocal) {
        issues.push(
          `[hreflang] ${page.relPath} -> ${targetPage.relPath} missing reciprocal alternate`
        );
      }
    }
  }

  for (const page of indexable) {
    if (!page.canonical) continue;
    const result = await fetchHead(page.canonical);
    if (result.status !== 200) {
      issues.push(
        `[canonical-url] ${page.relPath} canonical ${page.canonical} returned ${result.status}${
          result.location ? ` -> ${result.location}` : ""
        }`
      );
    }
  }

  const xml = await fs.readFile(path.join(ROOT, "sitemap.xml"), "utf8");
  const sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].trim()
  );
  for (const url of sitemapUrls) {
    const result = await fetchHead(url);
    if (result.status >= 300 && result.status < 400) {
      issues.push(
        `[sitemap] ${url} redirects (${result.status}) -> ${result.location}`
      );
      continue;
    }
    if (result.status !== 200) {
      issues.push(`[sitemap] ${url} returned ${result.status}`);
    }
  }

  const uniqueInternal = [...new Set(indexable.flatMap((p) => p.links))];
  for (const url of uniqueInternal) {
    const result = await fetchHead(url);
    if (result.status >= 400 || result.status < 0) {
      issues.push(`[link] ${url} returned ${result.status}`);
    }
  }

  if (issues.length) {
    console.error(`seo:verify failed with ${issues.length} issue(s):`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log(
    `seo:verify passed: ${indexable.length} indexable pages, ${sitemapUrls.length} sitemap URLs, ${uniqueInternal.length} internal links checked.`
  );
}

main().catch((err) => {
  console.error(`seo:verify execution failed: ${String(err?.stack || err)}`);
  process.exit(1);
});
