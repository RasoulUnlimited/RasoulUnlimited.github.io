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

  test("page has no duplicate element ids", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const duplicates = await page.evaluate(() => {
      const idMap = new Map<string, number>();
      document.querySelectorAll<HTMLElement>("[id]").forEach((el) => {
        const id = (el.id || "").trim();
        if (!id) {return;}
        idMap.set(id, (idMap.get(id) || 0) + 1);
      });
      return Array.from(idMap.entries())
        .filter(([, count]) => count > 1)
        .map(([id, count]) => ({ id, count }));
    });

    expect(duplicates).toEqual([]);
  });

  test("icon-only interactive controls expose accessible names", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const unnamedControls = await page.evaluate(() => {
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(
          "button, a[href], [role='button']"
        )
      );

      return controls
        .map((el) => {
          const text = (el.textContent || "").trim();
          const ariaLabel = (el.getAttribute("aria-label") || "").trim();
          const title = (el.getAttribute("title") || "").trim();
          const hasOnlyIcon = text.length === 0 && el.querySelector("i, svg");
          const hasName = ariaLabel.length > 0 || title.length > 0 || text.length > 0;

          if (!hasOnlyIcon) {return null;}
          if (hasName) {return null;}

          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || "",
            classes: el.className || "",
          };
        })
        .filter(Boolean);
    });

    expect(unnamedControls).toEqual([]);
  });

  test("faq accordion headers and panels keep valid ARIA linkage", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const invalidLinks = await page.evaluate(() => {
      const headers = Array.from(
        document.querySelectorAll<HTMLElement>("#faq-container .accordion-header")
      );

      return headers
        .map((header) => {
          const controls = (header.getAttribute("aria-controls") || "").trim();
          if (!controls) {
            return { reason: "missing-aria-controls", headerId: header.id || "" };
          }

          const panel = document.getElementById(controls);
          if (!panel) {
            return {
              reason: "missing-controlled-panel",
              headerId: header.id || "",
              controls,
            };
          }

          const labelledBy = (panel.getAttribute("aria-labelledby") || "").trim();
          if (!labelledBy || labelledBy !== (header.id || "")) {
            return {
              reason: "bad-aria-labelledby",
              headerId: header.id || "",
              controls,
              labelledBy,
            };
          }

          return null;
        })
        .filter(Boolean);
    });

    expect(invalidLinks).toEqual([]);
  });
});
