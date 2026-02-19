import { expect, test } from "@playwright/test";

const pages = [
  { key: "fa", path: "/index.html" },
  { key: "en", path: "/en/index.html" },
];

test.describe("Home Connect Section", () => {
  for (const pageMeta of pages) {
    test(`${pageMeta.key}: email and social links keep native navigation behavior`, async ({
      page,
    }) => {
      await page.goto(pageMeta.path, { waitUntil: "networkidle" });
      await page.locator("#connect").scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      const state = await page.evaluate(() => {
        const section = document.getElementById("connect");
        const email = section?.querySelector(
          '.email-link[href^="mailto:"], .contact-info a[href^="mailto:"]'
        ) as HTMLAnchorElement | null;
        const social = section?.querySelector(
          '.social-link-card[href^="http"], .connect-links-block a[href^="http"]'
        ) as HTMLAnchorElement | null;

        const isPrevented = (element: HTMLAnchorElement | null) => {
          if (!element) {return null;}
          const event = new MouseEvent("click", { bubbles: true, cancelable: true });
          element.dispatchEvent(event);
          return event.defaultPrevented;
        };

        return {
          hasEmail: !!email,
          hasSocial: !!social,
          emailPrevented: isPrevented(email),
          socialPrevented: isPrevented(social),
        };
      });

      expect(state.hasEmail).toBeTruthy();
      expect(state.hasSocial).toBeTruthy();
      expect(state.emailPrevented).toBe(false);
      expect(state.socialPrevented).toBe(false);
    });

    test(`${pageMeta.key}: copy button writes email to clipboard and shows feedback`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        (window as any).__copiedEmail = "";
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              (window as any).__copiedEmail = text;
            },
          },
        });
      });

      await page.goto(pageMeta.path, { waitUntil: "networkidle" });
      await page.locator("#connect").scrollIntoViewIfNeeded();

      const copyBtn = page.locator("#connect .copy-btn").first();
      await expect(copyBtn).toBeVisible();
      await copyBtn.click();

      await expect
        .poll(async () => {
          return page.evaluate(() => (window as any).__copiedEmail || "");
        })
        .toBe("rasoul.unlimited@gmail.com");

      await expect(page.locator(".dynamic-toast.show")).toBeVisible();
    });

    test(`${pageMeta.key}: connect section avoids mobile horizontal overflow`, async ({ page }) => {
      const viewports = [
        { width: 390, height: 844 },
        { width: 320, height: 568 },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
        await page.locator("#connect").scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);

        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth - window.innerWidth;
        });

        expect(overflow).toBeLessThanOrEqual(1);
      }
    });

    test(`${pageMeta.key}: connect interactive controls keep touch-friendly dimensions`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(pageMeta.path, { waitUntil: "domcontentloaded" });
      await page.locator("#connect").scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      const offenders = await page.evaluate(() => {
        const controls = Array.from(
          document.querySelectorAll<HTMLElement>(
            "#connect .copy-btn, #connect .social-link-card, #connect .full-width-btn, #connect .email-link"
          )
        );

        return controls
          .map((control) => {
            const rect = control.getBoundingClientRect();
            return {
              className: control.className,
              width: rect.width,
              height: rect.height,
            };
          })
          .filter((item) => item.width < 40 || item.height < 40);
      });

      expect(offenders).toEqual([]);
    });
  }

  test("en: connect links do not use role=button", async ({ page }) => {
    await page.goto("/en/index.html", { waitUntil: "networkidle" });

    const count = await page.evaluate(() => {
      return document.querySelectorAll("#connect a[role='button']").length;
    });

    expect(count).toBe(0);
  });
});
