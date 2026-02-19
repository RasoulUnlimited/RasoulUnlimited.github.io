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
    term: "home-fa",
    lang: "fa",
  },
  {
    key: "en",
    path: "/en/index.html",
    term: "home-en",
    lang: "en",
  },
] as const;

async function scrollToTestimonials(page: Page) {
  await page.locator("#testimonials").scrollIntoViewIfNeeded();
}

test.describe("Home Testimonials (Giscus)", () => {
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
});
