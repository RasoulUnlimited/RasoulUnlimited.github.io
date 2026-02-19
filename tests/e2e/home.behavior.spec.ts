import { expect, test } from "@playwright/test";

const HOME_PATH = "/index.html";

test.describe("FA Home Behavior", () => {
  test("loads homepage without page errors or request failures", async ({ page }) => {
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    page.on("requestfailed", (request) => {
      requestFailures.push(
        `${request.method()} ${request.url()} => ${request.failure()?.errorText || "unknown"}`
      );
    });

    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    await expect(page).toHaveTitle(/Rasoul Unlimited/);
    await expect(page.locator("#main-content")).toBeVisible();
    expect(pageErrors).toEqual([]);
    expect(requestFailures).toEqual([]);
  });

  test("mobile navigation toggles menu state and aria attributes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const hamburger = page.locator(".hamburger");
    const navLinks = page.locator(".nav-links");
    const aboutLink = page.locator('.nav-links a[href="#about"]');

    await expect(hamburger).toBeVisible();
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");

    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    await expect(navLinks).toHaveClass(/active/);

    await aboutLink.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    await expect(navLinks).not.toHaveClass(/active/);
  });

  test("about section uses semantic structure and dedicated CTA classes", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const about = page.locator("#about");
    await expect(about).toBeVisible();
    await expect(about.locator(".about-actions .about-btn")).toHaveCount(2);
    await expect(about.locator(".about-actions .hero-btn")).toHaveCount(0);
    await expect(about.locator(".about-cards .info-card h3")).toHaveCount(3);
    await expect(about.locator(".about-cards .info-card h4")).toHaveCount(0);

    const semantics = await page.evaluate(() => {
      const stats = document.querySelector("#about .about-stats");
      const cards = document.querySelector("#about .about-cards");
      const subtitle = document.querySelector("#about .about-subtitle");

      return {
        statsTag: stats?.tagName || "",
        cardsTag: cards?.tagName || "",
        subtitleAlign: subtitle ? getComputedStyle(subtitle).textAlign : "",
      };
    });

    expect(semantics.statsTag).toBe("UL");
    expect(semantics.cardsTag).toBe("UL");
    expect(semantics.subtitleAlign).toBe("center");
  });

  test("about CTA buttons become full-width and stacked on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#about .about-actions .about-btn");

    const metrics = await page.evaluate(() => {
      const actions = document.querySelector("#about .about-actions");
      const buttons = Array.from(
        document.querySelectorAll("#about .about-actions .about-btn")
      ) as HTMLElement[];
      const actionsStyle = actions ? getComputedStyle(actions) : null;
      const actionsWidth = actions
        ? Math.round(actions.getBoundingClientRect().width)
        : 0;

      return {
        actionsFlexDirection: actionsStyle?.flexDirection || "",
        actionsWidth,
        buttons: buttons.map((btn) => ({
          width: Math.round(btn.getBoundingClientRect().width),
          minHeight: parseFloat(getComputedStyle(btn).minHeight || "0"),
        })),
      };
    });

    expect(metrics.actionsFlexDirection).toBe("column");
    expect(metrics.buttons.length).toBe(2);
    metrics.buttons.forEach((btn) => {
      expect(btn.width).toBeGreaterThanOrEqual(metrics.actionsWidth - 6);
      expect(btn.minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  test("about section remains visible when JavaScript is disabled", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#about")).toBeVisible();

    const aboutStyle = await page.evaluate(() => {
      const section = document.querySelector("#about");
      if (!section) {return null;}
      const s = getComputedStyle(section);
      return { opacity: s.opacity, transform: s.transform };
    });

    expect(aboutStyle).not.toBeNull();
    expect(aboutStyle?.opacity).not.toBe("0");
    expect(aboutStyle?.transform).toBe("none");
    await context.close();
  });

  test("about section remains visible if AOS script fails to load", async ({ page }) => {
    await page.route("**/assets/vendor/aos/aos.min.js", (route) => route.abort());
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);

    const isFallbackEnabled = await page.evaluate(() =>
      document.documentElement.classList.contains("aos-disabled")
    );
    expect(isFallbackEnabled).toBeTruthy();
    await expect(page.locator("#about")).toBeVisible();

    const aboutOpacity = await page.locator("#about").evaluate((el) =>
      getComputedStyle(el).opacity
    );
    expect(aboutOpacity).not.toBe("0");
  });

  test("about card headings keep readable contrast in dark mode", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);

    const ratio = await page.evaluate(() => {
      const card = document.querySelector("#about .info-card");
      const heading = document.querySelector("#about .info-card h3");
      if (!card || !heading) {return 0;}

      const parseRgb = (input: string) => {
        const match = input.match(/rgba?\(([^)]+)\)/i);
        if (!match) {return null;}
        const [r, g, b] = match[1]
          .split(",")
          .slice(0, 3)
          .map((v) => Number(v.trim()));
        if ([r, g, b].some((n) => Number.isNaN(n))) {return null;}
        return { r, g, b };
      };

      const luminance = (rgb: { r: number; g: number; b: number }) => {
        const convert = (v: number) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return (
          0.2126 * convert(rgb.r) +
          0.7152 * convert(rgb.g) +
          0.0722 * convert(rgb.b)
        );
      };

      const fg = parseRgb(getComputedStyle(heading).color);
      const bg = parseRgb(getComputedStyle(card).backgroundColor);
      if (!fg || !bg) {return 0;}

      const l1 = luminance(fg);
      const l2 = luminance(bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
    });

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test("theme toggle updates current theme state", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const beforeTheme = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme") || ""
    );

    await page.evaluate(() => {
      const toggle = document.getElementById("theme-toggle");
      if (toggle instanceof HTMLInputElement) {
        toggle.click();
      }
    });

    await expect
      .poll(async () => {
        return page.evaluate(
          () => document.documentElement.getAttribute("data-theme") || ""
        );
      })
      .not.toBe(beforeTheme);

    const afterTheme = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme") || ""
    );
    expect(["dark", "light"]).toContain(afterTheme);

    const storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(["dark", "light"]).toContain(storedTheme || "");
  });

  test("scrolling shows floating action buttons and updates progress", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await expect(page.locator("#scroll-to-top")).toHaveClass(/visible/);
    await expect(page.locator("#share-page-button")).toHaveClass(/visible/);

    const progressValue = await page
      .locator("#scroll-progress-bar")
      .getAttribute("aria-valuenow");
    expect(Number(progressValue || "0")).toBeGreaterThan(0);
  });

  test("faq supports accordion interaction and search filtering", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const firstItem = page.locator("#faq-container .faq-item").first();
    const firstHeader = firstItem.locator(".accordion-header");
    const firstAnswer = firstItem.locator(".accordion-content");
    const searchInput = page.locator("#faq-search");
    const clearButton = page.locator("#clear-search");

    await firstHeader.click();
    await expect(firstHeader).toHaveAttribute("aria-expanded", "true");
    await expect(firstAnswer).toHaveAttribute("aria-hidden", "false");

    await searchInput.fill("doi");
    await page.waitForTimeout(450);

    const visibleItems = page.locator("#faq-container .faq-item:not([hidden])");
    await expect(visibleItems).toHaveCount(1);
    await expect(visibleItems.first()).toHaveAttribute("id", "faq-item-fa-2");
    await expect(page.locator("#faq-no-results")).toBeHidden();
    await expect(clearButton).toBeVisible();
  });

  test("home page keeps sw-register script disabled", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.locator('script[src*="sw-register"]')).toHaveCount(0);
  });
});
