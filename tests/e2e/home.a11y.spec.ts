import { expect, test } from "@playwright/test";

const HOME_PATH = "/index.html";

test.describe("FA Home Accessibility and Integrity", () => {
  test("skip-link moves keyboard focus to main content", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();

    await page.keyboard.press("Enter");

    await expect
      .poll(async () => {
        return page.evaluate(() => document.activeElement?.id || "");
      })
      .toBe("main-content");

    await expect
      .poll(async () => {
        return page.evaluate(() => window.location.hash);
      })
      .toBe("#main-content");
  });

  test("author meta remains unique after scripts execute", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const authorMetaCount = await page.locator('meta[name="author"]').count();
    expect(authorMetaCount).toBe(1);
  });

  test("all aria-controls references point to existing ids", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const brokenControls = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>("[aria-controls]")
      );

      return elements
        .map((element) => {
          const targetId = (element.getAttribute("aria-controls") || "").trim();
          if (!targetId) {return null;}

          return document.getElementById(targetId)
            ? null
            : {
              tag: element.tagName.toLowerCase(),
              id: element.id || "",
              controls: targetId,
            };
        })
        .filter(Boolean);
    });

    expect(brokenControls).toEqual([]);
  });
});
