import { expect, test, type Locator, type Page } from "@playwright/test";

const MOCK_GISCUS_CLIENT = `
(() => {
  const parent = document.currentScript && document.currentScript.parentElement;
  if (!parent) { return; }
  const iframe = document.createElement("iframe");
  iframe.className = "giscus-frame";
  iframe.title = "Giscus";
  iframe.src = "about:blank";
  parent.appendChild(iframe);
  setTimeout(() => {
    iframe.dispatchEvent(new Event("load"));
  }, 20);
})();
`;

const PAGES = [
  {
    key: "fa",
    path: "/index.html",
    term: "index",
    lang: "fa",
  },
  {
    key: "en",
    path: "/en/index.html",
    term: "en/",
    lang: "en",
  },
] as const;

const MOCK_FEATURED_FEEDBACK_ITEMS = [
  {
    id: "fa-1",
    lang: "fa",
    quote: "FA first quote",
    author: "FA Author 1",
    role: "FA Role 1",
    source_url: "https://example.com/fa/1",
    source_label: "Source 1",
    date: "2026-02-10",
  },
  {
    id: "en-1",
    lang: "en",
    quote: "EN first quote",
    author: "EN Author 1",
    role: "EN Role 1",
    source_url: "https://example.com/en/1",
    source_label: "Source 1",
    date: "2026-02-09",
  },
  {
    id: "fa-2",
    lang: "fa",
    quote: "FA second quote",
    author: "FA Author 2",
    role: "FA Role 2",
    source_url: "https://example.com/fa/2",
    source_label: "Source 2",
    date: "2026-02-08",
  },
  {
    id: "en-2",
    lang: "en",
    quote: "EN second quote",
    author: "EN Author 2",
    role: "EN Role 2",
    source_url: "https://example.com/en/2",
    source_label: "Source 2",
    date: "2026-02-07",
  },
  {
    id: "fa-3",
    lang: "fa",
    quote: "FA third quote",
    author: "FA Author 3",
    role: "FA Role 3",
    source_url: "https://example.com/fa/3",
    source_label: "Source 3",
    date: "2026-02-06",
  },
  {
    id: "en-3",
    lang: "en",
    quote: "EN third quote",
    author: "EN Author 3",
    role: "EN Role 3",
    source_url: "https://example.com/en/3",
    source_label: "Source 3",
    date: "2026-02-05",
  },
  {
    id: "en-4",
    lang: "en",
    quote: "EN fourth quote",
    author: "EN Author 4",
    role: "EN Role 4",
    source_url: "https://example.com/en/4",
    source_label: "Source 4",
    date: "2026-02-04",
  },
] as const;

async function scrollToTestimonials(page: Page) {
  await page.locator("#testimonials").scrollIntoViewIfNeeded();
}

async function waitForGiscusStatus(root: Locator, status: "idle" | "loading" | "ready" | "error") {
  await expect
    .poll(async () => root.getAttribute("data-giscus-status"))
    .toBe(status);
}

test.describe("Home Testimonials (Giscus)", () => {
  test.describe("Visual layout resilience", () => {
    for (const pageMeta of PAGES) {
      test(`${pageMeta.key}: testimonials section avoids horizontal overflow on mobile viewport`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 360, height: 780 });
        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await scrollToTestimonials(page);

        const overflow = await page.evaluate(() => {
          const section = document.getElementById("testimonials");
          if (!(section instanceof HTMLElement)) {
            return null;
          }

          const pageOverflow = document.documentElement.scrollWidth - window.innerWidth;
          const intro = section.querySelector(".feedback-intro-content");
          const featured = section.querySelector(".featured-feedback-grid");
          const giscus = section.querySelector(".giscus-wrapper");

          const introOverflow =
            intro instanceof HTMLElement ? intro.scrollWidth - intro.clientWidth : 0;
          const featuredOverflow =
            featured instanceof HTMLElement ? featured.scrollWidth - featured.clientWidth : 0;
          const giscusOverflow =
            giscus instanceof HTMLElement ? giscus.scrollWidth - giscus.clientWidth : 0;

          return {
            pageOverflow,
            introOverflow,
            featuredOverflow,
            giscusOverflow,
          };
        });

        expect(overflow).not.toBeNull();
        expect((overflow?.pageOverflow || 0)).toBeLessThanOrEqual(1);
        expect((overflow?.introOverflow || 0)).toBeLessThanOrEqual(1);
        expect((overflow?.featuredOverflow || 0)).toBeLessThanOrEqual(1);
        expect((overflow?.giscusOverflow || 0)).toBeLessThanOrEqual(1);
      });
    }
  });

  test.describe("Featured feedback rail", () => {
    for (const pageMeta of PAGES) {
      test(`${pageMeta.key}: renders language-filtered featured feedback cards`, async ({
        page,
      }) => {
        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await scrollToTestimonials(page);

        const rail = page.locator("#testimonials [data-featured-feedback-root]");
        await expect
          .poll(async () => rail.getAttribute("data-featured-feedback-status"))
          .toBe("ready");

        const cards = rail.locator(".featured-feedback-card");
        await expect(cards).toHaveCount(3);

        const langs = await cards.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-feedback-lang") || "")
        );
        expect(langs.every((lang) => lang === pageMeta.lang)).toBeTruthy();
      });
    }
  });

  test.describe("A11y semantics", () => {
    for (const pageMeta of PAGES) {
      test(`${pageMeta.key}: exposes status and description wiring for giscus`, async ({
        page,
      }) => {
        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await scrollToTestimonials(page);

        const root = page.locator("#testimonials [data-giscus-root]");
        await expect(root).toHaveAttribute("aria-describedby", "giscus-status-description");
        await expect(root.locator("#giscus-status-description")).toHaveCount(1);
        await expect(root.locator(".giscus-loading")).toHaveAttribute("role", "status");
      });
    }
  });

  test.describe("Failure fallback", () => {
    for (const pageMeta of PAGES) {
      test(`${pageMeta.key}: shows error state with retry and fallback when giscus is blocked`, async ({
        page,
      }) => {
        await page.route("**/giscus.app/client.js", (route) => route.abort());
        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await scrollToTestimonials(page);

        await expect
          .poll(async () => {
            return page.evaluate(() => {
              const root = document.querySelector("#testimonials [data-giscus-root]");
              return root?.getAttribute("data-giscus-status") || "";
            });
          })
          .toBe("error");

        const root = page.locator("#testimonials [data-giscus-root]");
        await expect(root.locator(".giscus-error")).toBeVisible();
        await expect(root.locator(".giscus-retry-btn")).toBeVisible();
        await expect(root.locator(".giscus-fallback-link")).toBeVisible();
        await expect(root.locator(".giscus-loading")).toBeHidden();
      });
    }
  });

  test("fa: retry flow recovers from initial failure and loads iframe", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
    });

    let callCount = 0;
    await page.route("**/giscus.app/client.js", (route) => {
      callCount += 1;
      if (callCount === 1) {
        route.abort();
        return;
      }
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: MOCK_GISCUS_CLIENT,
      });
    });

    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await scrollToTestimonials(page);

    const root = page.locator("#testimonials [data-giscus-root]");

    await expect
      .poll(async () => {
        return root.getAttribute("data-giscus-status");
      })
      .toBe("error");

    await root.locator(".giscus-retry-btn").click();

    await expect
      .poll(async () => {
        return root.getAttribute("data-giscus-status");
      })
      .toBe("ready");

    await expect(root.locator("iframe.giscus-frame")).toBeVisible();
    await expect(root.locator(".giscus-error")).toBeHidden();
  });

  test("fa: retry button is keyboard operable", async ({ page }) => {
    let callCount = 0;
    await page.route("**/giscus.app/client.js", (route) => {
      callCount += 1;
      if (callCount === 1) {
        route.abort();
        return;
      }

      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: MOCK_GISCUS_CLIENT,
      });
    });

    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await scrollToTestimonials(page);

    const root = page.locator("#testimonials [data-giscus-root]");
    await expect
      .poll(async () => root.getAttribute("data-giscus-status"))
      .toBe("error");

    const retryButton = root.locator(".giscus-retry-btn");
    await retryButton.focus();
    await page.keyboard.press("Enter");

    await expect
      .poll(async () => root.getAttribute("data-giscus-status"))
      .toBe("ready");
  });

  test("en: success flow hides loader and renders iframe", async ({ page }) => {
    await page.route("**/giscus.app/client.js", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: MOCK_GISCUS_CLIENT,
      })
    );

    await page.goto("/en/index.html", { waitUntil: "domcontentloaded" });
    await scrollToTestimonials(page);

    const root = page.locator("#testimonials [data-giscus-root]");
    await expect
      .poll(async () => {
        return root.getAttribute("data-giscus-status");
      })
      .toBe("ready");

    await expect(root.locator("iframe.giscus-frame")).toBeVisible();
    await expect(root.locator(".giscus-loading")).toBeHidden();
    await expect(root.locator(".giscus-error")).toBeHidden();
  });

  test("en: online event retries failed load and recovers", async ({ page }) => {
    await page.route("**/giscus.app/client.js", (route) => route.abort());

    await page.goto("/en/index.html", { waitUntil: "domcontentloaded" });
    await scrollToTestimonials(page);

    const root = page.locator("#testimonials [data-giscus-root]");
    await expect
      .poll(async () => root.getAttribute("data-giscus-status"))
      .toBe("error");

    await page.unroute("**/giscus.app/client.js");
    await page.route("**/giscus.app/client.js", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: MOCK_GISCUS_CLIENT,
      })
    );

    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    await expect
      .poll(async () => root.getAttribute("data-giscus-status"))
      .toBe("ready");
  });

  test.describe("Loader state machine", () => {
    for (const pageMeta of PAGES) {
      test(`${pageMeta.key}: stays idle before intersection and loads only when testimonials enter viewport`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 320, height: 480 });
        await page.route("**/giscus.app/client.js", (route) =>
          route.fulfill({
            status: 200,
            contentType: "application/javascript",
            body: MOCK_GISCUS_CLIENT,
          })
        );

        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        const root = page.locator("#testimonials [data-giscus-root]");

        await waitForGiscusStatus(root, "idle");
        await expect(root.locator('.giscus-container script[src*="giscus.app/client.js"]')).toHaveCount(
          0
        );

        await root.scrollIntoViewIfNeeded();
        await waitForGiscusStatus(root, "ready");
        await expect(root.locator('.giscus-container script[src*="giscus.app/client.js"]')).toHaveCount(
          1
        );
      });

      test(`${pageMeta.key}: invalid config enters error without requesting giscus script`, async ({
        page,
      }) => {
        let requestCount = 0;
        await page.route("**/giscus.app/client.js", (route) => {
          requestCount += 1;
          route.abort();
        });

        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => {
          const root = document.querySelector("#testimonials [data-giscus-root]");
          if (root instanceof HTMLElement) {
            root.removeAttribute("data-giscus-repo-id");
          }
        });
        await scrollToTestimonials(page);

        const root = page.locator("#testimonials [data-giscus-root]");
        await waitForGiscusStatus(root, "error");
        await expect(root.locator(".giscus-error")).toBeVisible();
        await expect(root.locator('.giscus-container script[src*="giscus.app/client.js"]')).toHaveCount(
          0
        );
        expect(requestCount).toBe(0);
      });
    }

    test("en: auto retry recovers once after script-error without user action", async ({ page }) => {
      await page.addInitScript(() => {
        (window as { __giscusRetryEvents?: Array<Record<string, unknown>> }).__giscusRetryEvents = [];
      });

      let callCount = 0;
      await page.route("**/giscus.app/client.js", (route) => {
        callCount += 1;
        if (callCount === 1) {
          route.abort();
          return;
        }

        route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: MOCK_GISCUS_CLIENT,
        });
      });

      await page.goto("/en/index.html", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        const root = document.querySelector("#testimonials [data-giscus-root]");
        root?.addEventListener("giscus:retry", (event) => {
          const detail = (event as CustomEvent).detail || {};
          const store = (window as { __giscusRetryEvents?: Array<Record<string, unknown>> })
            .__giscusRetryEvents || [];
          store.push({
            source: typeof detail.source === "string" ? detail.source : "",
            reason: typeof detail.reason === "string" ? detail.reason : "",
            attempt: Number(detail.attempt || 0),
          });
          (window as { __giscusRetryEvents?: Array<Record<string, unknown>> }).__giscusRetryEvents =
            store;
        });
      });
      await scrollToTestimonials(page);

      const root = page.locator("#testimonials [data-giscus-root]");
      await waitForGiscusStatus(root, "ready");
      expect(callCount).toBe(2);

      const retryEvents = await page.evaluate(() => {
        return (window as { __giscusRetryEvents?: Array<Record<string, unknown>> })
          .__giscusRetryEvents || [];
      });
      expect(retryEvents).toHaveLength(1);
      expect(retryEvents[0]).toMatchObject({
        source: "auto",
        reason: "script-error",
        attempt: 1,
      });
    });

    test("en: offline mode blocks auto retry after script-error", async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(window.navigator, "onLine", {
          configurable: true,
          get: () => false,
        });
      });

      let callCount = 0;
      await page.route("**/giscus.app/client.js", (route) => {
        callCount += 1;
        route.abort();
      });

      await page.goto("/en/index.html", { waitUntil: "domcontentloaded" });
      await scrollToTestimonials(page);

      const root = page.locator("#testimonials [data-giscus-root]");
      await waitForGiscusStatus(root, "error");
      await page.waitForTimeout(1300);

      expect(callCount).toBe(1);
      await expect(root.locator(".giscus-retry-btn")).toBeVisible();
      await expect(root.locator(".giscus-error")).toBeVisible();
    });

    test("fa: missing giscus container fails with deterministic error state", async ({ page }) => {
      let requestCount = 0;
      await page.route("**/giscus.app/client.js", (route) => {
        requestCount += 1;
        route.abort();
      });

      await page.goto("/index.html", { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        const root = document.querySelector("#testimonials [data-giscus-root]");
        const container = root?.querySelector(".giscus-container");
        if (container) {
          container.remove();
        }
      });
      await scrollToTestimonials(page);

      const root = page.locator("#testimonials [data-giscus-root]");
      await waitForGiscusStatus(root, "error");
      await expect(root.locator(".giscus-error")).toBeVisible();
      expect(requestCount).toBe(0);
    });
  });

  test.describe("Events and runtime API", () => {
    test("fa: emits lifecycle events and analytics labels for giscus states", async ({ page }) => {
      await page.addInitScript(() => {
        (window as { __giscusEvents?: Array<Record<string, unknown>> }).__giscusEvents = [];
        (window as { __gtagLabels?: string[] }).__gtagLabels = [];

        (window as { gtag?: (...args: unknown[]) => void }).gtag = (...args: unknown[]) => {
          const maybePayload =
            args.length > 2 && typeof args[2] === "object" && args[2]
              ? (args[2] as Record<string, unknown>)
              : null;
          const label =
            maybePayload && typeof maybePayload.event_label === "string"
              ? maybePayload.event_label
              : "";
          ((window as { __gtagLabels?: string[] }).__gtagLabels || []).push(label);
        };

        ["giscus:state-change", "giscus:loading", "giscus:ready", "giscus:theme-sync"].forEach(
          (name) => {
            document.addEventListener(name, (event) => {
              const detail = (event as CustomEvent).detail || {};
              ((window as { __giscusEvents?: Array<Record<string, unknown>> }).__giscusEvents ||
                []).push({
                name,
                status: typeof detail.status === "string" ? detail.status : "",
                theme: typeof detail.theme === "string" ? detail.theme : "",
              });
            });
          }
        );
      });

      await page.route("**/giscus.app/client.js", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: MOCK_GISCUS_CLIENT,
        })
      );

      await page.goto("/index.html", { waitUntil: "domcontentloaded" });
      await scrollToTestimonials(page);

      const root = page.locator("#testimonials [data-giscus-root]");
      await waitForGiscusStatus(root, "ready");

      await page.evaluate(() => {
        document.documentElement.setAttribute("data-theme", "dark");
        window.dispatchEvent(new Event("themechange"));
      });

      await expect
        .poll(async () => {
          return page.evaluate(() => {
            const events =
              (window as { __giscusEvents?: Array<Record<string, unknown>> }).__giscusEvents || [];
            return events.filter((event) => event.name === "giscus:theme-sync").length;
          });
        })
        .toBeGreaterThan(0);

      const telemetry = await page.evaluate(() => {
        return {
          events:
            (window as { __giscusEvents?: Array<Record<string, unknown>> }).__giscusEvents || [],
          labels: (window as { __gtagLabels?: string[] }).__gtagLabels || [],
        };
      });

      const stateStatuses = telemetry.events
        .filter((event) => event.name === "giscus:state-change")
        .map((event) => String(event.status || ""));

      expect(stateStatuses).toContain("loading");
      expect(stateStatuses).toContain("ready");
      expect(telemetry.labels).toContain("loading");
      expect(telemetry.labels).toContain("ready");
      expect(telemetry.labels).not.toContain("idle");
    });

    test("en: exposes __giscusLoader API with getStatus and reloadAll", async ({ page }) => {
      let callCount = 0;
      await page.route("**/giscus.app/client.js", (route) => {
        callCount += 1;
        route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: MOCK_GISCUS_CLIENT,
        });
      });

      await page.goto("/en/index.html", { waitUntil: "domcontentloaded" });
      await scrollToTestimonials(page);

      const root = page.locator("#testimonials [data-giscus-root]");
      await waitForGiscusStatus(root, "ready");

      const initialStatus = await page.evaluate(() => {
        const loader = (window as { __giscusLoader?: { getStatus: (root: Element | null) => string } })
          .__giscusLoader;
        const root = document.querySelector("#testimonials [data-giscus-root]");
        return loader?.getStatus(root || null) || "";
      });
      expect(initialStatus).toBe("ready");

      await page.evaluate(() => {
        const loader = (window as { __giscusLoader?: { reloadAll: () => void } }).__giscusLoader;
        loader?.reloadAll();
      });

      await expect
        .poll(() => callCount)
        .toBeGreaterThanOrEqual(2);
      await waitForGiscusStatus(root, "ready");

      const afterReloadStatus = await page.evaluate(() => {
        const loader = (window as { __giscusLoader?: { getStatus: (root: Element | null) => string } })
          .__giscusLoader;
        const root = document.querySelector("#testimonials [data-giscus-root]");
        return loader?.getStatus(root || null) || "";
      });
      expect(afterReloadStatus).toBe("ready");
      await expect(root.locator("iframe.giscus-frame")).toHaveCount(1);
    });
  });

  test.describe("Featured feedback data contract", () => {
    for (const pageMeta of PAGES) {
      test(`${pageMeta.key}: renders first 3 cards in source order with secure link attrs`, async ({
        page,
      }) => {
        await page.addInitScript(() => {
          (window as { __featuredFeedbackEvents?: string[] }).__featuredFeedbackEvents = [];
          document.addEventListener("featured-feedback:ready", () => {
            ((window as { __featuredFeedbackEvents?: string[] }).__featuredFeedbackEvents || []).push(
              "ready"
            );
          });
          document.addEventListener("featured-feedback:error", () => {
            ((window as { __featuredFeedbackEvents?: string[] }).__featuredFeedbackEvents || []).push(
              "error"
            );
          });
        });

        await page.route("**/assets/data/featured-feedback.json", (route) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ items: MOCK_FEATURED_FEEDBACK_ITEMS }),
          })
        );

        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await scrollToTestimonials(page);

        const rail = page.locator("#testimonials [data-featured-feedback-root]");
        await expect
          .poll(async () => rail.getAttribute("data-featured-feedback-status"))
          .toBe("ready");

        const cards = rail.locator(".featured-feedback-card");
        await expect(cards).toHaveCount(3);

        const rendered = await cards.evaluateAll((nodes) =>
          nodes.map((node) => {
            const link = node.querySelector("a.featured-feedback-link");
            return {
              id: node.getAttribute("data-featured-feedback-item") || "",
              lang: node.getAttribute("data-feedback-lang") || "",
              linkHref: link?.getAttribute("href") || "",
              linkTarget: link?.getAttribute("target") || "",
              linkRel: link?.getAttribute("rel") || "",
            };
          })
        );

        const expectedIds = MOCK_FEATURED_FEEDBACK_ITEMS.filter(
          (item) => item.lang === pageMeta.lang
        )
          .slice(0, 3)
          .map((item) => item.id);

        expect(rendered.map((item) => item.id)).toEqual(expectedIds);
        expect(rendered.every((item) => item.lang === pageMeta.lang)).toBeTruthy();
        rendered.forEach((item) => {
          expect(item.linkHref.startsWith("https://example.com/")).toBeTruthy();
          expect(item.linkTarget).toBe("_blank");
          expect(item.linkRel).toContain("noopener");
          expect(item.linkRel).toContain("noreferrer");
        });

        const lifecycle = await page.evaluate(() => {
          return (window as { __featuredFeedbackEvents?: string[] }).__featuredFeedbackEvents || [];
        });
        expect(lifecycle).toContain("ready");
        expect(lifecycle).not.toContain("error");
      });
    }

    test("fa: shows empty state when no fa item exists in payload", async ({ page }) => {
      await page.route("**/assets/data/featured-feedback.json", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "en-only",
                lang: "en",
                quote: "English only",
                author: "EN",
                role: "Role",
                source_url: "https://example.com/en-only",
                source_label: "Source",
                date: "2026-02-03",
              },
            ],
          }),
        })
      );

      await page.goto("/index.html", { waitUntil: "domcontentloaded" });
      await scrollToTestimonials(page);

      const rail = page.locator("#testimonials [data-featured-feedback-root]");
      await expect
        .poll(async () => rail.getAttribute("data-featured-feedback-status"))
        .toBe("empty");
      await expect(rail.locator(".featured-feedback-empty")).toBeVisible();
      await expect(rail.locator(".featured-feedback-card")).toHaveCount(0);
    });

    test("en: sanitizes quote content and applies author/role/link fallbacks", async ({ page }) => {
      await page.addInitScript(() => {
        (window as { __xssTriggered?: boolean }).__xssTriggered = false;
      });

      await page.route("**/assets/data/featured-feedback.json", (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                id: "en-xss-test",
                lang: "en",
                quote: '<img src=x onerror="window.__xssTriggered = true"> quoted as plain text',
                source_url: "https://example.com/sanitized",
                date: "invalid-date",
              },
            ],
          }),
        })
      );

      await page.goto("/en/index.html", { waitUntil: "domcontentloaded" });
      await scrollToTestimonials(page);

      const rail = page.locator("#testimonials [data-featured-feedback-root]");
      await expect
        .poll(async () => rail.getAttribute("data-featured-feedback-status"))
        .toBe("ready");

      const card = rail.locator(".featured-feedback-card").first();
      await expect(card.locator(".featured-feedback-author")).toHaveText("GitHub user");
      await expect(card.locator(".featured-feedback-role")).toHaveText("Visitor");
      await expect(card.locator(".featured-feedback-link")).toHaveText("View all discussions");
      await expect(card.locator("time.featured-feedback-date")).toHaveCount(0);

      const security = await page.evaluate(() => {
        const card = document.querySelector("#testimonials .featured-feedback-card");
        return {
          renderedImageCount: card ? card.querySelectorAll("img").length : -1,
          quoteText: card?.querySelector(".featured-feedback-quote")?.textContent || "",
          xssTriggered: !!(window as { __xssTriggered?: boolean }).__xssTriggered,
        };
      });

      expect(security.renderedImageCount).toBe(0);
      expect(security.quoteText).toContain("<img");
      expect(security.xssTriggered).toBeFalsy();
    });

    for (const pageMeta of PAGES) {
      test(`${pageMeta.key}: source failure shows fallback link with safe rel`, async ({ page }) => {
        await page.route("**/assets/data/featured-feedback.json", (route) =>
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ error: "forced-test-error" }),
          })
        );

        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await scrollToTestimonials(page);

        const rail = page.locator("#testimonials [data-featured-feedback-root]");
        await expect
          .poll(async () => rail.getAttribute("data-featured-feedback-status"))
          .toBe("error");

        const fallbackUrl = await rail.getAttribute("data-featured-feedback-fallback");
        const fallbackLink = rail.locator(".featured-feedback-error .featured-feedback-link");

        await expect(fallbackLink).toBeVisible();
        await expect(fallbackLink).toHaveAttribute("href", fallbackUrl || "");
        await expect(fallbackLink).toHaveAttribute("target", "_blank");
        await expect(fallbackLink).toHaveAttribute("rel", /noopener/);
        await expect(fallbackLink).toHaveAttribute("rel", /noreferrer/);
      });
    }
  });

  test.describe("No-JS fallback", () => {
    for (const pageMeta of PAGES) {
      test(`${pageMeta.key}: renders noscript fallback when JavaScript is disabled`, async ({
        browser,
      }) => {
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();

        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await expect(page.locator("#testimonials .giscus-noscript")).toBeVisible();

        await context.close();
      });
    }
  });

  test.describe("Config contract", () => {
    for (const pageMeta of PAGES) {
      test(`${pageMeta.key}: injects giscus script with full expected config payload`, async ({
        page,
      }) => {
        await page.route("**/giscus.app/client.js", (route) =>
          route.fulfill({
            status: 200,
            contentType: "application/javascript",
            body: MOCK_GISCUS_CLIENT,
          })
        );

        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await scrollToTestimonials(page);

        await expect
          .poll(async () => {
            return page.evaluate(() => {
              const root = document.querySelector("#testimonials [data-giscus-root]");
              const script = root?.querySelector(
                '.giscus-container script[src*="giscus.app/client.js"]'
              );
              return !!script;
            });
          })
          .toBeTruthy();

        const payload = await page.evaluate(() => {
          const root = document.querySelector("#testimonials [data-giscus-root]");
          const script = root?.querySelector(
            '.giscus-container script[src*="giscus.app/client.js"]'
          ) as HTMLScriptElement | null;
          return {
            repo: script?.getAttribute("data-repo") || "",
            repoId: script?.getAttribute("data-repo-id") || "",
            category: script?.getAttribute("data-category") || "",
            categoryId: script?.getAttribute("data-category-id") || "",
            mapping: script?.getAttribute("data-mapping") || "",
            term: script?.getAttribute("data-term") || "",
            lang: script?.getAttribute("data-lang") || "",
            strict: script?.getAttribute("data-strict") || "",
            reactionsEnabled: script?.getAttribute("data-reactions-enabled") || "",
            emitMetadata: script?.getAttribute("data-emit-metadata") || "",
            inputPosition: script?.getAttribute("data-input-position") || "",
            loading: script?.getAttribute("data-loading") || "",
            aiIntegration: script?.getAttribute("data-ai-integration") || "",
            crossOrigin: script?.crossOrigin || "",
            async: !!script?.async,
          };
        }) as {
          repo: string;
          repoId: string;
          category: string;
          categoryId: string;
          mapping: string;
          term: string;
          lang: string;
          strict: string;
          reactionsEnabled: string;
          emitMetadata: string;
          inputPosition: string;
          loading: string;
          aiIntegration: string;
          crossOrigin: string;
          async: boolean;
        };

        expect(payload.repo).toBe("RasoulUnlimited/comments");
        expect(payload.repoId).toBe("R_kgDOOx48HQ");
        expect(payload.category).toBe("Q&A");
        expect(payload.categoryId).toBe("DIC_kwDOOx48Hc4Cqrc1");
        expect(payload.mapping).toBe("specific");
        expect(payload.term).toBe(pageMeta.term);
        expect(payload.lang).toBe(pageMeta.lang);
        expect(payload.strict).toBe("1");
        expect(payload.reactionsEnabled).toBe("1");
        expect(payload.emitMetadata).toBe("0");
        expect(payload.inputPosition).toBe("top");
        expect(payload.loading).toBe("lazy");
        expect(payload.aiIntegration).toBe("giscus-comments");
        expect(payload.crossOrigin).toBe("anonymous");
        expect(payload.async).toBeTruthy();
      });
    }
  });

  test("fa: theme sync updates applied theme after toggle", async ({ page }) => {
    await page.route("**/giscus.app/client.js", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: MOCK_GISCUS_CLIENT,
      })
    );

    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await scrollToTestimonials(page);

    const root = page.locator("#testimonials [data-giscus-root]");
    await expect
      .poll(async () => {
        return root.getAttribute("data-giscus-status");
      })
      .toBe("ready");

    const beforeTheme = await root.getAttribute("data-giscus-theme-applied");

    await page.evaluate(() => {
      const toggle = document.getElementById("theme-toggle");
      if (toggle instanceof HTMLInputElement) {
        toggle.click();
      }
    });

    await expect
      .poll(async () => {
        return root.getAttribute("data-giscus-theme-applied");
      })
      .not.toBe(beforeTheme || "");
  });

  test("fa: reduced motion mode disables giscus ready pulse animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/index.html", { waitUntil: "domcontentloaded" });
    await scrollToTestimonials(page);

    const animationName = await page.evaluate(() => {
      const root = document.querySelector("#testimonials [data-giscus-root]");
      if (!(root instanceof HTMLElement)) {return "";}
      root.classList.add("giscus-ready-pulse");
      return window.getComputedStyle(root).animationName || "";
    });

    expect(animationName).toBe("none");
  });

  test("en: forced-colors mode keeps featured cards visible with borders", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/en/index.html", { waitUntil: "domcontentloaded" });
    await scrollToTestimonials(page);

    const card = page.locator("#testimonials .featured-feedback-card").first();
    await expect(card).toBeVisible();

    const borderStyle = await card.evaluate((node) => window.getComputedStyle(node).borderStyle);
    expect(borderStyle).toBe("solid");
  });
});
