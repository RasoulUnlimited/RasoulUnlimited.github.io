import { expect, test, type Page } from "@playwright/test";

const CONTACT_EMAIL = "rasoul.unlimited@gmail.com";
const EXPECTED_SOCIAL_LINK_COUNT = 15;

const pages = [
  { key: "fa", path: "/index.html", resumePath: "/resume.html" },
  { key: "en", path: "/en/index.html", resumePath: "/en/resume.html" },
] as const;

async function gotoConnect(
  page: Page,
  path: string,
  waitUntil: "networkidle" | "domcontentloaded" = "networkidle"
) {
  await page.goto(path, { waitUntil });
  await page.locator("#connect").scrollIntoViewIfNeeded();
}

async function clearToasts(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll(".dynamic-toast").forEach((node) => node.remove());
  });
}

test.describe("Home Connect Section", () => {
  for (const pageMeta of pages) {
    test(`${pageMeta.key}: keeps stable connect structure and link contract`, async ({
      page,
    }) => {
      await gotoConnect(page, pageMeta.path);

      const audit = await page.evaluate((expectedEmail) => {
        const section = document.getElementById("connect");
        if (!(section instanceof HTMLElement)) {
          return null;
        }

        const headingId = (section.getAttribute("aria-labelledby") || "").trim();
        const heading = headingId ? document.getElementById(headingId) : null;
        const email = section.querySelector<HTMLAnchorElement>(".email-link");
        const copyBtn = section.querySelector<HTMLButtonElement>(".copy-btn");
        const resume = section.querySelector<HTMLAnchorElement>(
          ".resume-download .full-width-btn"
        );
        const categories = section.querySelectorAll(".link-category");
        const socialLinks = Array.from(
          section.querySelectorAll<HTMLAnchorElement>(".social-link-card")
        );

        const socialIssues = socialLinks
          .map((link) => {
            const href = (link.getAttribute("href") || "").trim();
            const rel = (link.getAttribute("rel") || "")
              .toLowerCase()
              .split(/\s+/)
              .filter(Boolean);
            const hasRel =
              rel.includes("noopener") &&
              rel.includes("noreferrer") &&
              rel.includes("me");
            const hasLabel = (link.getAttribute("aria-label") || "").trim().length > 0;
            const hasVisibleText = (link.textContent || "").replace(/\s+/g, " ").trim().length > 0;

            if (
              href.startsWith("https://") &&
              link.getAttribute("target") === "_blank" &&
              hasRel &&
              hasLabel &&
              hasVisibleText
            ) {
              return null;
            }

            return {
              href,
              target: link.getAttribute("target") || "",
              rel: link.getAttribute("rel") || "",
              ariaLabel: link.getAttribute("aria-label") || "",
              text: (link.textContent || "").replace(/\s+/g, " ").trim(),
            };
          })
          .filter(Boolean);

        return {
          headingId,
          headingText: (heading?.textContent || "").replace(/\s+/g, " ").trim(),
          statusBadgeCount: section.querySelectorAll(".status-badge").length,
          responseChipCount: section.querySelectorAll(".status-response-chip").length,
          emailHref: email?.getAttribute("href") || "",
          emailText: (email?.textContent || "").trim(),
          copyType: copyBtn?.getAttribute("type") || "",
          copyData: copyBtn?.getAttribute("data-copy") || "",
          resumeHref: resume?.getAttribute("href") || "",
          categoryCount: categories.length,
          socialCount: socialLinks.length,
          uniqueSocialHrefCount: new Set(socialLinks.map((link) => link.href)).size,
          socialIssues,
          expectedEmail,
        };
      }, CONTACT_EMAIL);

      expect(audit).not.toBeNull();
      expect(audit?.headingId.length).toBeGreaterThan(0);
      expect(audit?.headingText.length).toBeGreaterThan(0);
      expect(audit?.statusBadgeCount).toBe(1);
      expect(audit?.responseChipCount).toBe(1);
      expect(audit?.emailHref).toBe(`mailto:${CONTACT_EMAIL}`);
      expect(audit?.emailText).toBe(CONTACT_EMAIL);
      expect(audit?.copyType).toBe("button");
      expect(audit?.copyData).toBe(audit?.expectedEmail);
      expect(audit?.resumeHref).toBe(pageMeta.resumePath);
      expect(audit?.categoryCount).toBe(4);
      expect(audit?.socialCount).toBe(EXPECTED_SOCIAL_LINK_COUNT);
      expect(audit?.uniqueSocialHrefCount).toBe(EXPECTED_SOCIAL_LINK_COUNT);
      expect(audit?.socialIssues).toEqual([]);
    });

    test(`${pageMeta.key}: anchors keep native behavior and semantic role usage`, async ({
      page,
    }) => {
      await gotoConnect(page, pageMeta.path, "domcontentloaded");

      const state = await page.evaluate(() => {
        const section = document.getElementById("connect");
        if (!section) {
          return null;
        }

        const sampleAnchors = [
          section.querySelector<HTMLAnchorElement>(".email-link"),
          section.querySelector<HTMLAnchorElement>(".resume-download .full-width-btn"),
          section.querySelector<HTMLAnchorElement>(".social-link-card"),
        ].filter(Boolean) as HTMLAnchorElement[];

        const prevented = sampleAnchors.map((anchor) => {
          const event = new MouseEvent("click", { bubbles: true, cancelable: true });
          anchor.dispatchEvent(event);
          return {
            href: anchor.getAttribute("href") || "",
            defaultPrevented: event.defaultPrevented,
            role: anchor.getAttribute("role") || "",
          };
        });

        const roleButtonCount = section.querySelectorAll("a[role='button']").length;
        return { prevented, roleButtonCount };
      });

      expect(state).not.toBeNull();
      expect(state?.roleButtonCount).toBe(0);
      for (const sample of state?.prevented || []) {
        expect(sample.defaultPrevented).toBe(false);
        expect(sample.role).toBe("");
      }
    });

    test(`${pageMeta.key}: copy button success path writes email, toggles copied state, and recovers`, async ({
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

      await gotoConnect(page, pageMeta.path);
      await clearToasts(page);

      const copyBtn = page.locator("#connect .copy-btn").first();
      await expect(copyBtn).toBeVisible();
      await copyBtn.click();

      await expect
        .poll(async () => {
          return page.evaluate(() => (window as any).__clipboardWrites || []);
        })
        .toEqual([CONTACT_EMAIL]);

      await expect(copyBtn).toHaveClass(/copied/);
      await expect(copyBtn.locator(".fa-check")).toBeVisible();

      await expect
        .poll(async () => {
          return page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length);
        })
        .toBeGreaterThan(0);

      await expect
        .poll(async () => {
          return copyBtn.evaluate((node) => node.classList.contains("copied"));
        })
        .toBeFalsy();
      await expect(copyBtn.locator(".fa-copy")).toBeVisible();
    });

    test(`${pageMeta.key}: clipboard write failure shows feedback and avoids stuck copied state`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        (window as any).__clipboardAttempts = 0;
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async () => {
              (window as any).__clipboardAttempts += 1;
              throw new Error("copy-denied");
            },
          },
        });
      });

      await gotoConnect(page, pageMeta.path);
      await clearToasts(page);

      const copyBtn = page.locator("#connect .copy-btn").first();
      await copyBtn.click();

      await expect
        .poll(async () => {
          return page.evaluate(() => (window as any).__clipboardAttempts || 0);
        })
        .toBe(1);

      await expect(copyBtn).not.toHaveClass(/copied/);
      await expect
        .poll(async () => {
          return page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length);
        })
        .toBeGreaterThan(0);
    });

    test(`${pageMeta.key}: clipboard unsupported path still surfaces user feedback`, async ({
      page,
    }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: undefined,
        });
      });

      await gotoConnect(page, pageMeta.path);
      await clearToasts(page);

      const copyBtn = page.locator("#connect .copy-btn").first();
      await copyBtn.click();

      await expect(copyBtn).not.toHaveClass(/copied/);
      await expect
        .poll(async () => {
          return page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length);
        })
        .toBeGreaterThan(0);
    });

    test(`${pageMeta.key}: avoids horizontal overflow on narrow mobile widths`, async ({
      page,
    }) => {
      const viewports = [
        { width: 390, height: 844 },
        { width: 360, height: 740 },
        { width: 320, height: 568 },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await gotoConnect(page, pageMeta.path, "domcontentloaded");

        const overflow = await page.evaluate(() => {
          const section = document.getElementById("connect");
          if (!(section instanceof HTMLElement)) {
            return null;
          }

          const beforeX = window.scrollX;
          window.scrollTo({ left: 9999, top: window.scrollY, behavior: "auto" });
          const afterX = window.scrollX;
          window.scrollTo({ left: beforeX, top: window.scrollY, behavior: "auto" });

          return {
            pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
            maxHorizontalScrollX: afterX,
          };
        });

        expect(overflow).not.toBeNull();
        expect(overflow?.pageOverflow || 0).toBeLessThanOrEqual(1);
        expect(overflow?.maxHorizontalScrollX || 0).toBeLessThanOrEqual(1);
      }
    });

    test(`${pageMeta.key}: no-JS mode keeps connect content and links visible`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();

      await gotoConnect(page, pageMeta.path, "domcontentloaded");

      await expect(page.locator("#connect")).toBeVisible();
      await expect(page.locator("#connect .email-link")).toHaveAttribute(
        "href",
        `mailto:${CONTACT_EMAIL}`
      );
      await expect(page.locator("#connect .copy-btn")).toBeVisible();
      await expect(page.locator("#connect .social-link-card")).toHaveCount(
        EXPECTED_SOCIAL_LINK_COUNT
      );
      await expect(page.locator("#connect .resume-download .full-width-btn")).toHaveAttribute(
        "href",
        pageMeta.resumePath
      );

      await context.close();
    });
  }
});
