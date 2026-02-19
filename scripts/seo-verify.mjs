import fs from "node:fs/promises";
import path from "node:path";

/**
 * SEO Verify - improved & CI-friendly
 * Node 18+ (global fetch)
 *
 * Features:
 * - Network cache (dedupe requests)
 * - Manual redirect chain
 * - Retry/backoff for 429/5xx (+ Retry-After)
 * - HEAD -> GET fallback
 * - Separate page links vs asset links
 * - Canonical checks + duplicates
 * - Hreflang reciprocal checks (basic)
 * - Sitemap URL checks + coverage checks
 * - Orphan pages detection
 * - Output: text or json
 * - Flags: --warn-only, --format=json
 */

// ---------------------- CLI ----------------------
const ARGS = new Set(process.argv.slice(2));
const WARN_ONLY = ARGS.has("--warn-only");
const FORMAT_JSON = ARGS.has("--format=json");

// ---------------------- Config ----------------------
const ROOT = process.cwd();
const DOMAIN = "https://rasoulunlimited.ir";
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "playwright-report",
  "test-results",
]);
const INCLUDE_DIR_PREFIXES = ["includes/"];

// Allowlist hosts considered internal
const INTERNAL_HOSTS = new Set([
  new URL(DOMAIN).host,
  // "www.rasoulunlimited.ir",
]);

// Networking
const USER_AGENT = "seo-verify/3.0 (Node 18+ fetch)";
const CONCURRENCY = 10;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 10;
const RETRIES = 2; // number of retries after initial attempt
const BACKOFF_MS = [500, 1500, 3000]; // used up to RETRIES

// Behavior toggles
const FAIL_ON_REDIRECT_CANONICAL = true;
const FAIL_ON_REDIRECT_SITEMAP = true;
const FAIL_ON_REDIRECT_PAGE_LINK = false; // <a href>
const FAIL_ON_REDIRECT_ASSET_LINK = false; // src/link href assets

// Asset extensions you might want to ignore (optional)
// If you want to check ALL assets, keep this empty set
const IGNORE_ASSET_EXT = new Set([
  // ".map",
]);

// ---------------------- Issue handling ----------------------
/**
 * @typedef {"error"|"warn"} Severity
 * @typedef {{severity: Severity, code: string, message: string, page?: string, url?: string, details?: any}} Issue
 */

/** @type {Issue[]} */
const issues = [];

function pushIssue(severity, code, message, extra = {}) {
  issues.push({ severity, code, message, ...extra });
}

function err(code, message, extra) {
  pushIssue("error", code, message, extra);
}

function warn(code, message, extra) {
  pushIssue("warn", code, message, extra);
}

// ---------------------- Helpers ----------------------
function stripComments(input) {
  return input.replace(/<!--[\s\S]*?-->/g, "");
}

function safeLower(s) {
  return (s || "").toString().trim().toLowerCase();
}

function isProbablyDynamicTemplateRef(raw) {
  return raw.includes("${") || raw.includes("{{") || raw.includes("{%");
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    // normalize host casing, remove default ports
    u.host = u.host.toLowerCase();
    if (
      (u.protocol === "https:" && u.port === "443") ||
      (u.protocol === "http:" && u.port === "80")
    ) {
      u.port = "";
    }
    return u.href;
  } catch {
    return "";
  }
}

function canonicalKey(url) {
  const n = normalizeUrl(url);
  if (!n) return "";
  try {
    const u = new URL(n);
    // normalize /index.html to /
    if (u.pathname.endsWith("/index.html")) {
      u.pathname = u.pathname.slice(0, -"/index.html".length) + "/";
    }
    if (u.pathname === "/index.html") u.pathname = "/";
    // normalize multiple slashes
    u.pathname = u.pathname.replace(/\/{2,}/g, "/");
    const href = u.href;
    return href.replace(/\/$/, "");
  } catch {
    return n.replace(/\/$/, "");
  }
}

function isIncludePath(relPath) {
  const p = relPath.replace(/\\/g, "/");
  return INCLUDE_DIR_PREFIXES.some((prefix) => p.startsWith(prefix));
}

function isInternalUrl(url) {
  const n = normalizeUrl(url);
  if (!n) return false;
  try {
    const u = new URL(n);
    return INTERNAL_HOSTS.has(u.host);
  } catch {
    return false;
  }
}

function toAbsoluteUrl(raw, relFilePath) {
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
  if (isProbablyDynamicTemplateRef(value)) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("//")) return `https:${value}`;

  const fromDir = path.dirname(relFilePath).split(path.sep).join("/");
  const base =
    fromDir === "." ? `${DOMAIN}/` : `${DOMAIN}/${fromDir.replace(/\/+$/, "")}/`;

  try {
    return new URL(value, base).href;
  } catch {
    return "";
  }
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
  return match ? (match[1] ?? "").trim() : "";
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

function getExt(u) {
  try {
    const url = new URL(u);
    const p = url.pathname;
    const i = p.lastIndexOf(".");
    if (i === -1) return "";
    return p.slice(i).toLowerCase();
  } catch {
    return "";
  }
}

function extractAssetCandidates(text) {
  const out = [];

  const srcPatterns = [
    /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi,
    /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi,
    /<source\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi,
    /<video\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi,
    /<audio\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi,
    /<track\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi,
    /<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi,
  ];

  for (const re of srcPatterns) {
    for (const [value] of parseAll(re, text)) {
      if ((value || "").trim()) out.push(value.trim());
    }
  }

  // Include <link href>, except rel=canonical and rel=alternate
  for (const [attrs] of parseAll(/<link\b([^>]*)>/gi, text)) {
    const href = parseFirst(/\bhref\s*=\s*["']([^"']+)["']/i, attrs || "");
    if (!href) continue;
    const rel = safeLower(parseFirst(/\brel\s*=\s*["']([^"']+)["']/i, attrs || ""));
    const relTokens = new Set(rel.split(/\s+/).filter(Boolean));
    if (relTokens.has("canonical") || relTokens.has("alternate")) continue;
    out.push(href);
  }

  return out;
}

// ---------------------- Concurrency limiter ----------------------
function createLimiter(max) {
  let active = 0;
  /** @type {Array<() => void>} */
  const queue = [];

  const runNext = () => {
    if (active >= max) return;
    const job = queue.shift();
    if (!job) return;
    active += 1;
    job();
  };

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push(async () => {
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          active -= 1;
          runNext();
        }
      });
      runNext();
    });
  };
}

function withTimeout(ms, controller) {
  const t = setTimeout(() => controller.abort(), ms);
  return () => clearTimeout(t);
}

// ---------------------- Networking (redirect chain + retry + cache) ----------------------
/**
 * @typedef {{
 *  ok: boolean,
 *  url: string,
 *  status: number,
 *  methodUsed: "HEAD"|"GET",
 *  finalUrl: string,
 *  chain: Array<{url: string, status: number, location?: string}>,
 *  error?: string,
 * }} NetResult
 */

const netCache = new Map(); // key -> Promise<NetResult>

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseRetryAfter(headerValue) {
  if (!headerValue) return 0;
  const s = headerValue.trim();
  // seconds
  if (/^\d+$/.test(s)) return Number(s) * 1000;
  // http date
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const diff = t - Date.now();
    return diff > 0 ? diff : 0;
  }
  return 0;
}

async function singleFetch(url, { method, manualRedirect }) {
  const controller = new AbortController();
  const clear = withTimeout(REQUEST_TIMEOUT_MS, controller);

  try {
    const res = await fetch(url, {
      method,
      redirect: manualRedirect ? "manual" : "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: "*/*",
      },
      signal: controller.signal,
    });

    return { res, error: null };
  } catch (e) {
    return { res: null, error: String(e?.message || e || "network_error") };
  } finally {
    clear();
  }
}

async function fetchWithRedirectChain(url, method) {
  /** @type {NetResult} */
  const result = {
    ok: false,
    url,
    status: -1,
    methodUsed: method,
    finalUrl: url,
    chain: [],
  };

  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const { res, error } = await singleFetch(current, {
      method,
      manualRedirect: true,
    });
    if (!res) {
      result.ok = false;
      result.status = -1;
      result.finalUrl = current;
      result.error = error || "network_error";
      result.chain.push({ url: current, status: -1 });
      return result;
    }

    const status = res.status;
    const loc = res.headers.get("location") || "";
    result.chain.push({ url: current, status, location: loc || undefined });

    // Redirect?
    if (status >= 300 && status < 400 && loc) {
      try {
        current = new URL(loc, current).href;
      } catch {
        // invalid location
        result.ok = true;
        result.status = status;
        result.finalUrl = current;
        return result;
      }
      continue;
    }

    // Final
    result.ok = true;
    result.status = status;
    result.finalUrl = res.url || current;
    return result;
  }

  // Too many redirects
  result.ok = true;
  result.status = 310; // nonstandard marker
  result.finalUrl = current;
  result.error = "too_many_redirects";
  return result;
}

async function smartCheckUrlUncached(url) {
  // Try HEAD with redirects chain
  let r = await fetchWithRedirectChain(url, "HEAD");

  // Retry on 429 / 5xx / network
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const retryable =
      r.status < 0 ||
      r.status === 429 ||
      r.status === 502 ||
      r.status === 503 ||
      r.status === 504;

    if (!retryable) break;

    let wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] || 1000;

    // We don't have headers in chain except location; so do a quick GET manual to see Retry-After if 429
    if (r.status === 429) {
      const { res } = await singleFetch(url, { method: "GET", manualRedirect: true });
      if (res) {
        const ra = parseRetryAfter(res.headers.get("retry-after"));
        if (ra) wait = Math.max(wait, ra);
      }
    }

    await sleep(wait);
    r = await fetchWithRedirectChain(url, "HEAD");
  }

  // Fallback to GET if HEAD likely unsupported or suspicious
  const headBadStatuses = new Set([405, 403, 400, 401, 406, 415]);
  if (r.ok && headBadStatuses.has(r.status)) {
    let g = await fetchWithRedirectChain(url, "GET");

    for (let attempt = 0; attempt < RETRIES; attempt += 1) {
      const retryable =
        g.status < 0 ||
        g.status === 429 ||
        g.status === 502 ||
        g.status === 503 ||
        g.status === 504;
      if (!retryable) break;
      const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] || 1000;
      await sleep(wait);
      g = await fetchWithRedirectChain(url, "GET");
    }

    // Prefer GET if it's clearly better
    if (g.ok && (g.status === 200 || g.status === 204 || g.status === 304)) return g;
    return g.ok ? g : r;
  }

  return r;
}

function smartCheckUrl(url) {
  const key = canonicalKey(url) || url;
  if (!netCache.has(key)) netCache.set(key, smartCheckUrlUncached(url));
  return netCache.get(key);
}

// ---------------------- Main ----------------------
async function main() {
  const htmlFiles = await walkHtmlFiles(ROOT);

  /** @type {Array<{
   *  relPath: string,
   *  canonical: string,
   *  expectedUrl: string,
   *  hreflangs: Array<{lang: string, href: string}>,
   *  pageLinks: string[],
   *  assetLinks: string[],
   *  isInclude: boolean,
   *  noindex: boolean,
   * }>} */
  const pages = [];

  // -------- Parse pages --------
  for (const filePath of htmlFiles) {
    const raw = await fs.readFile(filePath, "utf8");
    const text = stripComments(raw);

    const relPath = path.relative(ROOT, filePath).split(path.sep).join("/");
    const expectedUrl = htmlToExpectedUrl(filePath);
    const isInclude = isIncludePath(relPath);

    const canonical =
      parseFirst(
        /<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i,
        text
      ) ||
      parseFirst(
        /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']canonical["'][^>]*>/i,
        text
      );

    const robots = safeLower(
      parseFirst(
        /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/i,
        text
      )
    );
    const noindex = robots.includes("noindex");

    const hreflangs = parseAll(
      /<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']([^"']+)["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
      text
    ).map(([lang, href]) => ({ lang: safeLower(lang), href: (href || "").trim() }));

    // Only <a href> links for page graph
    const pageLinks = parseAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi, text)
      .map(([value]) => normalizeUrl(toAbsoluteUrl(value, relPath)))
      .filter(Boolean)
      .filter(isInternalUrl);

    const pageLinkKeySet = new Set(pageLinks.map(canonicalKey).filter(Boolean));

    // Asset links: src attributes + <link href> (excluding canonical/alternate)
    const assetCandidates = extractAssetCandidates(text);
    const normalizedAssets = assetCandidates
      .map((value) => normalizeUrl(toAbsoluteUrl(value, relPath)))
      .filter(Boolean)
      .filter(isInternalUrl)
      .filter((u) => {
        const ext = getExt(u);
        if (!ext) return true;
        return !IGNORE_ASSET_EXT.has(ext);
      });

    const assetLinks = [];
    const seenAssetKeys = new Set();
    for (const url of normalizedAssets) {
      const key = canonicalKey(url);
      if (!key) continue;
      if (pageLinkKeySet.has(key)) continue; // prevent duplicate page+asset checks
      if (seenAssetKeys.has(key)) continue;
      seenAssetKeys.add(key);
      assetLinks.push(url);
    }

    // JSON-LD validity
    const jsonLdBlocks = parseAll(
      /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      text
    );

    for (let i = 0; i < jsonLdBlocks.length; i += 1) {
      const body = (jsonLdBlocks[i][0] || "").trim();
      if (!body) continue;
      try {
        JSON.parse(body);
      } catch (e) {
        err(
          "jsonld",
          `${relPath} block #${i + 1} invalid JSON: ${String(e?.message || e)}`,
          { page: relPath }
        );
      }
    }

    // Canonical requirement
    if (!isInclude && !noindex && !canonical) {
      err("canonical", `${relPath} missing canonical tag`, { page: relPath });
    }

    pages.push({
      relPath,
      canonical: (canonical || "").trim(),
      expectedUrl,
      hreflangs,
      pageLinks,
      assetLinks,
      isInclude,
      noindex,
    });
  }

  const indexable = pages.filter((p) => !p.isInclude && !p.noindex);

  // -------- Canonical duplicates --------
  /** @type {Map<string, Array<typeof indexable[number]>>} */
  const canonicalToPages = new Map();
  for (const p of indexable) {
    if (!p.canonical) continue;
    const key = canonicalKey(p.canonical);
    if (!key) continue;
    if (!canonicalToPages.has(key)) canonicalToPages.set(key, []);
    canonicalToPages.get(key).push(p);
  }
  for (const [key, ps] of canonicalToPages.entries()) {
    if (ps.length > 1) {
      err(
        "canonical-duplicate",
        `multiple pages share same canonical (${key}): ${ps
          .map((x) => x.relPath)
          .join(", ")}`,
        { url: key }
      );
    }
  }

  // -------- Canonical matches expected URL --------
  for (const page of indexable) {
    if (!page.canonical) continue;
    const can = canonicalKey(page.canonical);
    const exp = canonicalKey(page.expectedUrl);
    if (can && exp && can !== exp) {
      err(
        "canonical-mismatch",
        `${page.relPath} canonical (${page.canonical}) does not match page URL (${page.expectedUrl})`,
        { page: page.relPath }
      );
    }
  }

  // -------- Hreflang reciprocal --------
  /** @type {Map<string, typeof indexable[number]>} */
  const pageByPrimaryUrl = new Map();
  for (const p of indexable) {
    const primary = canonicalKey(p.canonical || p.expectedUrl);
    if (primary) pageByPrimaryUrl.set(primary, p);
  }

  for (const page of indexable) {
    const source = canonicalKey(page.canonical || page.expectedUrl);
    if (!source) continue;

    for (const alt of page.hreflangs) {
      const target = canonicalKey(alt.href);
      if (!target) continue;
      const targetPage = pageByPrimaryUrl.get(target);
      if (!targetPage) continue;

      const reciprocal = targetPage.hreflangs.some(
        (entry) => canonicalKey(entry.href) === source
      );

      if (!reciprocal) {
        err(
          "hreflang",
          `${page.relPath} -> ${targetPage.relPath} missing reciprocal alternate`,
          { page: page.relPath }
        );
      }
    }
  }

  // -------- Sitemap read + URL checks --------
  let sitemapUrls = [];
  try {
    const xml = await fs.readFile(path.join(ROOT, "sitemap.xml"), "utf8");
    sitemapUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  } catch (e) {
    err("sitemap", `missing or unreadable sitemap.xml: ${String(e?.message || e)}`);
  }

  // -------- Coverage checks (sitemap vs pages) --------
  const sitemapSet = new Set(sitemapUrls.map(canonicalKey).filter(Boolean));
  const indexableExpectedSet = new Set(
    indexable.map((p) => canonicalKey(p.expectedUrl)).filter(Boolean)
  );

  for (const p of indexable) {
    const k = canonicalKey(p.expectedUrl);
    if (!k) continue;
    if (!sitemapSet.has(k)) {
      warn("sitemap-coverage", `indexable page missing from sitemap: ${p.expectedUrl}`, {
        page: p.relPath,
        url: p.expectedUrl,
      });
    }
  }

  for (const loc of sitemapSet) {
    if (!indexableExpectedSet.has(loc)) {
      warn("sitemap-coverage", `sitemap contains URL not found as indexable html: ${loc}`, {
        url: loc,
      });
    }
  }

  // -------- Orphan pages (no inbound links) --------
  // Use expectedUrl as node id (normalized)
  const inbound = new Map(); // key -> count
  for (const p of indexable) {
    const from = canonicalKey(p.expectedUrl);
    if (!from) continue;
    if (!inbound.has(from)) inbound.set(from, 0);

    for (const link of p.pageLinks) {
      const to = canonicalKey(link);
      if (!to) continue;
      inbound.set(to, (inbound.get(to) || 0) + 1);
    }
  }

  const homepageKey = canonicalKey(`${DOMAIN}/`);
  for (const p of indexable) {
    const k = canonicalKey(p.expectedUrl);
    if (!k || k === homepageKey) continue;
    const count = inbound.get(k) || 0;
    if (count === 0) {
      warn("orphan", `orphan page (no internal <a> links pointing to it): ${p.expectedUrl}`, {
        page: p.relPath,
        url: p.expectedUrl,
      });
    }
  }

  // -------- Network checks (concurrency) --------
  const limit = createLimiter(CONCURRENCY);

  // Canonical URL checks
  const canonicalChecks = indexable
    .filter((p) => p.canonical)
    .map((p) =>
      limit(async () => {
        const r = await smartCheckUrl(p.canonical);

        if (r.status < 0) {
          err("canonical-url", `${p.relPath} canonical network error: ${r.error || "error"}`, {
            page: p.relPath,
            url: p.canonical,
            details: r,
          });
          return;
        }

        const redirected =
          canonicalKey(r.finalUrl) && canonicalKey(r.finalUrl) !== canonicalKey(p.canonical);
        if (redirected) {
          const msg = `${p.relPath} canonical redirects -> ${r.finalUrl} (final status ${r.status}, via ${r.methodUsed})`;
          if (FAIL_ON_REDIRECT_CANONICAL) {
            err("canonical-redirect", msg, { page: p.relPath, url: p.canonical, details: r });
          } else {
            warn("canonical-redirect", msg, { page: p.relPath, url: p.canonical, details: r });
          }
          return;
        }

        if (r.status !== 200) {
          err(
            "canonical-url",
            `${p.relPath} canonical returned ${r.status} (via ${r.methodUsed})`,
            {
              page: p.relPath,
              url: p.canonical,
              details: r,
            }
          );
        }
      })
    );

  // Sitemap URL checks
  const sitemapChecks = sitemapUrls.map((url) =>
    limit(async () => {
      const r = await smartCheckUrl(url);

      if (r.status < 0) {
        err("sitemap-url", `${url} network error: ${r.error || "error"}`, { url, details: r });
        return;
      }

      const redirected = canonicalKey(r.finalUrl) && canonicalKey(r.finalUrl) !== canonicalKey(url);
      if (redirected) {
        const msg = `${url} redirects -> ${r.finalUrl} (final status ${r.status}, via ${r.methodUsed})`;
        if (FAIL_ON_REDIRECT_SITEMAP) err("sitemap-redirect", msg, { url, details: r });
        else warn("sitemap-redirect", msg, { url, details: r });
        return;
      }

      if (r.status !== 200) {
        err("sitemap-url", `${url} returned ${r.status} (via ${r.methodUsed})`, { url, details: r });
      }
    })
  );

  // Internal link checks (unique)
  const uniquePageLinks = [...new Set(indexable.flatMap((p) => p.pageLinks))];
  const uniqueAssetLinks = [...new Set(indexable.flatMap((p) => p.assetLinks))];

  const pageLinkChecks = uniquePageLinks.map((url) =>
    limit(async () => {
      const r = await smartCheckUrl(url);

      if (r.status < 0) {
        err("page-link", `${url} network error: ${r.error || "error"}`, { url, details: r });
        return;
      }

      const redirected = canonicalKey(r.finalUrl) && canonicalKey(r.finalUrl) !== canonicalKey(url);
      if (redirected) {
        const msg = `${url} redirects -> ${r.finalUrl} (final status ${r.status}, via ${r.methodUsed})`;
        if (FAIL_ON_REDIRECT_PAGE_LINK) err("page-link-redirect", msg, { url, details: r });
        else warn("page-link-redirect", msg, { url, details: r });
        return;
      }

      if (r.status >= 400) {
        err("page-link", `${url} returned ${r.status} (via ${r.methodUsed})`, { url, details: r });
      }
    })
  );

  const assetLinkChecks = uniqueAssetLinks.map((url) =>
    limit(async () => {
      const r = await smartCheckUrl(url);

      if (r.status < 0) {
        warn("asset-link", `${url} network error: ${r.error || "error"}`, { url, details: r });
        return;
      }

      const redirected = canonicalKey(r.finalUrl) && canonicalKey(r.finalUrl) !== canonicalKey(url);
      if (redirected) {
        const msg = `${url} redirects -> ${r.finalUrl} (final status ${r.status}, via ${r.methodUsed})`;
        if (FAIL_ON_REDIRECT_ASSET_LINK) err("asset-link-redirect", msg, { url, details: r });
        else warn("asset-link-redirect", msg, { url, details: r });
        return;
      }

      if (r.status >= 400) {
        warn("asset-link", `${url} returned ${r.status} (via ${r.methodUsed})`, { url, details: r });
      }
    })
  );

  await Promise.all([...canonicalChecks, ...sitemapChecks, ...pageLinkChecks, ...assetLinkChecks]);

  // ---------------------- Output ----------------------
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warn").length;

  if (FORMAT_JSON) {
    const payload = {
      ok: WARN_ONLY ? errorCount === 0 : issues.length === 0,
      counts: { errors: errorCount, warnings: warnCount, total: issues.length },
      issues,
      meta: {
        domain: DOMAIN,
        checked: {
          pages: indexable.length,
          sitemapUrls: sitemapUrls.length,
          uniquePageLinks: uniquePageLinks.length,
          uniqueAssetLinks: uniqueAssetLinks.length,
        },
      },
    };
    console.log(JSON.stringify(payload, null, 2));
  } else {
    if (issues.length === 0) {
      console.log(
        `seo:verify passed: ${indexable.length} indexable pages, ${sitemapUrls.length} sitemap URLs, ` +
          `${uniquePageLinks.length} page links, ${uniqueAssetLinks.length} asset links checked.`
      );
    } else {
      console.error(
        `seo:verify found ${issues.length} issue(s) — ${errorCount} error(s), ${warnCount} warning(s).`
      );

      // group by code
      const byCode = new Map();
      for (const it of issues) {
        const key = `${it.severity}:${it.code}`;
        if (!byCode.has(key)) byCode.set(key, []);
        byCode.get(key).push(it);
      }

      // stable-ish order: errors first then warns
      const keys = [...byCode.keys()].sort((a, b) => {
        const [sa] = a.split(":");
        const [sb] = b.split(":");
        if (sa !== sb) return sa === "error" ? -1 : 1;
        return a.localeCompare(b);
      });

      for (const key of keys) {
        const list = byCode.get(key);
        console.error(`\n[${key}] (${list.length})`);
        for (const it of list) {
          console.error(`- ${it.message}`);
        }
      }
    }
  }

  // Exit code policy
  if (WARN_ONLY) {
    if (errorCount > 0) process.exit(1);
    process.exit(0);
  } else {
    if (issues.length > 0) process.exit(1);
    process.exit(0);
  }
}

main().catch((e) => {
  console.error(`seo:verify execution failed: ${String(e?.stack || e)}`);
  process.exit(1);
});
