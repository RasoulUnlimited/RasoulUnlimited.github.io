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
