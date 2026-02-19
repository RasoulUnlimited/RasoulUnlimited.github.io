import { expect, test, type Page } from "@playwright/test";

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

async function scrollToTestimonials(page: Page) {
  await page.locator("#testimonials").scrollIntoViewIfNeeded();
}

test.describe("Home Testimonials (Giscus)", () => {
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
      test(`${pageMeta.key}: uses specific mapping and expected term/lang`, async ({ page }) => {
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
          );
          return {
            mapping: script?.getAttribute("data-mapping") || "",
            term: script?.getAttribute("data-term") || "",
            lang: script?.getAttribute("data-lang") || "",
          };
        }) as {
          mapping: string;
          term: string;
          lang: string;
        };

        expect(payload.mapping).toBe("specific");
        expect(payload.term).toBe(pageMeta.term);
        expect(payload.lang).toBe(pageMeta.lang);
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
