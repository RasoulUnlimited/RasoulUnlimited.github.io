import { expect, test, type Page } from "@playwright/test";

const HOME_PATH = "/index.html";

async function clearToasts(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll(".dynamic-toast").forEach((node) => node.remove());
  });
}

async function swipeToast(page: Page, id: string, deltaX: number, deltaY: number) {
  await page.evaluate(
    ({ toastId, moveX, moveY }) => {
      const toast = document.getElementById(toastId);
      if (!(toast instanceof HTMLElement)) {
        return;
      }
      const rect = toast.getBoundingClientRect();
      const startX = rect.left + rect.width * 0.45;
      const startY = rect.top + rect.height * 0.5;
      const pointerId = 17;
      const base = {
        bubbles: true,
        cancelable: true,
        pointerType: "touch",
        isPrimary: true,
      };

      toast.dispatchEvent(
        new PointerEvent("pointerdown", {
          ...base,
          pointerId,
          button: 0,
          clientX: startX,
          clientY: startY,
        })
      );
      toast.dispatchEvent(
        new PointerEvent("pointermove", {
          ...base,
          pointerId,
          buttons: 1,
          clientX: startX + moveX,
          clientY: startY + moveY,
        })
      );
      toast.dispatchEvent(
        new PointerEvent("pointerup", {
          ...base,
          pointerId,
          button: 0,
          clientX: startX + moveX,
          clientY: startY + moveY,
        })
      );
    },
    { toastId: id, moveX: deltaX, moveY: deltaY }
  );
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

  test("burst toasts keep at most 3 visible, expose stack variables, and drain queue", async ({
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

    const stackShifts = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>(".dynamic-toast.show")).map((node) => {
        const inline = node.style.getPropertyValue("--toast-stack-shift").trim();
        const computed = getComputedStyle(node).getPropertyValue("--toast-stack-shift").trim();
        return inline || computed;
      })
    );
    expect(new Set(stackShifts).size).toBeGreaterThan(1);

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

  test("valid mobile swipe dismisses toast", async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Swipe dismiss", {
        id: "swipe-dismiss-toast",
        kind: "info",
        duration: 6000,
      });
    });

    await expect(page.locator("#swipe-dismiss-toast")).toBeVisible();
    await swipeToast(page, "swipe-dismiss-toast", 124, 8);

    await expect
      .poll(
        async () => page.evaluate(() => document.querySelectorAll("#swipe-dismiss-toast").length),
        { timeout: 4000 }
      )
      .toBe(0);

    await context.close();
  });

  test("small or off-axis mobile swipe rebounds and keeps toast visible", async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Swipe rebound", {
        id: "swipe-rebound-toast",
        kind: "info",
        duration: 1400,
      });
    });

    await expect(page.locator("#swipe-rebound-toast")).toBeVisible();
    await swipeToast(page, "swipe-rebound-toast", 24, 5);

    await expect(page.locator("#swipe-rebound-toast")).toBeVisible();
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const toast = document.getElementById("swipe-rebound-toast");
            if (!(toast instanceof HTMLElement)) {
              return "";
            }
            return getComputedStyle(toast).getPropertyValue("--toast-swipe-x").trim();
          }),
        { timeout: 3000 }
      )
      .toMatch(/^0(px)?$/);

    await context.close();
  });

  test("reduced-motion queue drains without stuck visible toasts", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      for (let index = 0; index < 5; index += 1) {
        (window as any).createToast?.(`RM toast ${index + 1}`, {
          id: `rm-toast-${index + 1}`,
          kind: "info",
          duration: 160,
        });
      }
    });

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
        { timeout: 2500 }
      )
      .toBeLessThanOrEqual(3);

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast").length),
        { timeout: 6000 }
      )
      .toBe(0);

    await context.close();
  });
});
