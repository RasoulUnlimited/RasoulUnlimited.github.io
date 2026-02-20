import { expect, test, type Page } from "@playwright/test";

const HOME_PATH = "/index.html";

async function clearToasts(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll(".dynamic-toast").forEach((node) => node.remove());
  });
}

test.describe("Toast lifecycle", () => {
  test("reduced-motion toast appears and auto-dismisses without getting stuck", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Reduced motion toast", {
        id: "reduced-motion-toast",
        kind: "info",
        duration: 180,
      });
    });

    await expect(page.locator("#reduced-motion-toast")).toBeVisible();

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
        { timeout: 4000 }
      )
      .toBe(0);

    await expect(page.locator("#reduced-motion-toast")).toHaveCount(0);
    await context.close();
  });

  test("burst toasts keep at most 3 visible and queued items are drained", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      for (let index = 0; index < 7; index += 1) {
        (window as any).createToast?.(`Burst toast ${index + 1}`, {
          id: `burst-toast-${index + 1}`,
          kind: index % 3 === 0 ? "success" : "info",
          duration: 450,
        });
      }
    });

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
        { timeout: 2500 }
      )
      .toBe(3);

    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            Array.from(document.querySelectorAll<HTMLElement>(".dynamic-toast.show")).some(
              (node) => /^burst-toast-[4-7]$/.test(node.id)
            )
          ),
        { timeout: 5000 }
      )
      .toBeTruthy();

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast").length),
        { timeout: 6000 }
      )
      .toBe(0);
  });

  test("dedupe by id updates existing toast and keeps a single node", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("First payload", {
        id: "dedupe-toast",
        kind: "info",
        duration: 3000,
      });
      (window as any).createToast?.("Second payload", {
        id: "dedupe-toast",
        kind: "success",
        duration: 3000,
      });
    });

    await expect(page.locator("#dedupe-toast")).toHaveCount(1);
    await expect(page.locator("#dedupe-toast")).toContainText("Second payload");
    await expect(page.locator("#dedupe-toast")).toHaveClass(/toast-kind-success/);
  });
});
