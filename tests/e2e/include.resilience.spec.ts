import { expect, test } from "@playwright/test";

const EN_ABOUT_PATH = "/en/about.html";

test.describe("Include Resilience", () => {
  test("reuses cached include fragments when include endpoints fail", async ({ page }) => {
    await page.goto(EN_ABOUT_PATH, { waitUntil: "domcontentloaded" });

    await expect(page.locator(".navbar nav")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    await page.waitForFunction(
      () => document.querySelectorAll("[data-include-html]").length === 0
    );

    await page.route("**/includes/*.html", (route) => route.abort());
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.locator(".navbar nav")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    const staleIncludeCount = await page
      .locator('[data-include-stale="true"]')
      .count();
    expect(staleIncludeCount).toBeGreaterThanOrEqual(1);

    const staleInclude = page.locator('[data-include-stale="true"]').first();
    await expect(staleInclude).toHaveAttribute("data-include-source", /includes\/.+\.html$/);
  });

  test("shows a visible fallback when include fetch fails without cache", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await context.route("**/includes/*.html", (route) => route.abort());

    const page = await context.newPage();
    await page.goto(EN_ABOUT_PATH, { waitUntil: "domcontentloaded" });

    const fallback = page.locator(".include-fallback").first();
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText("temporarily unavailable");
    await expect(fallback.locator(".include-retry")).toBeVisible();

    const failedIncludeCount = await page
      .locator('[data-include-failed="true"]')
      .count();
    expect(failedIncludeCount).toBeGreaterThanOrEqual(1);

    const retryableCount = await page
      .locator('[data-include-retryable="true"]')
      .count();
    expect(retryableCount).toBeGreaterThanOrEqual(1);

    await context.close();
  });
});
