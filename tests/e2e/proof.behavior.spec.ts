import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  { key: "fa", path: "/proof.html" },
  { key: "en", path: "/en/proof.html" },
] as const;

async function clearToasts(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll(".dynamic-toast").forEach((node) => node.remove());
  });
}

test.describe("Proof copy/share toasts", () => {
  for (const pageMeta of PAGES) {
    test(`${pageMeta.key}: copy button triggers exactly one clipboard write and one visible toast`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        (window as any).__clipboardWrites = [];
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              (window as any).__clipboardWrites.push(text);
            },
          },
        });
      });

      await page.goto(pageMeta.path, { waitUntil: "networkidle" });
      await clearToasts(page);

      const copyBtn = page.locator(".copy-btn").first();
      await expect(copyBtn).toBeVisible();
      await copyBtn.click();

      await expect
        .poll(
          async () => page.evaluate(() => ((window as any).__clipboardWrites || []).length),
          { timeout: 2500 }
        )
        .toBe(1);

      await expect
        .poll(
          async () => page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
          { timeout: 2500 }
        )
        .toBe(1);
    });

    test(`${pageMeta.key}: share button fallback (no Web Share API) shows a single copy toast`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        (window as any).__clipboardWrites = [];
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: undefined,
        });
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              (window as any).__clipboardWrites.push(text);
            },
          },
        });
      });

      await page.goto(pageMeta.path, { waitUntil: "networkidle" });
      await clearToasts(page);

      const shareBtn = page.locator(".share-btn").first();
      await expect(shareBtn).toBeVisible();
      await shareBtn.click();

      await expect
        .poll(
          async () => page.evaluate(() => ((window as any).__clipboardWrites || []).length),
          { timeout: 2500 }
        )
        .toBe(1);

      await expect(page.locator("#share-copy-toast")).toBeVisible();
      await expect
        .poll(
          async () => page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
          { timeout: 2500 }
        )
        .toBe(1);
    });

    test(`${pageMeta.key}: share success uses Web Share payload and shows one success toast`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        (window as any).__sharePayload = null;
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async (payload: { title?: string; url?: string }) => {
            (window as any).__sharePayload = payload;
          },
        });
      });

      await page.goto(pageMeta.path, { waitUntil: "networkidle" });
      await clearToasts(page);

      const shareBtn = page.locator(".share-btn").first();
      await expect(shareBtn).toBeVisible();
      await shareBtn.click();

      await expect
        .poll(async () => page.evaluate(() => (window as any).__sharePayload), { timeout: 2500 })
        .not.toBeNull();
      await expect(page.locator("#share-success-toast")).toBeVisible();
      await expect
        .poll(
          async () => page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
          { timeout: 2500 }
        )
        .toBe(1);
    });

    test(`${pageMeta.key}: share failure path shows one error toast when both share and copy fail`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async () => {
            throw new Error("share-failure");
          },
        });
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: undefined,
        });

        try {
          Object.defineProperty(document, "execCommand", {
            configurable: true,
            value: () => false,
          });
        } catch {}
      });

      await page.goto(pageMeta.path, { waitUntil: "networkidle" });
      await clearToasts(page);

      const shareBtn = page.locator(".share-btn").first();
      await expect(shareBtn).toBeVisible();
      await shareBtn.click();

      await expect(page.locator("#share-error-toast")).toBeVisible();
      await expect
        .poll(
          async () => page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
          { timeout: 2500 }
        )
        .toBe(1);
    });
  }
});

