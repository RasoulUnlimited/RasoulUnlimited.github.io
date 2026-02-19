import { expect, test } from "@playwright/test";

const HOME_PATH = "/index.html";

test.describe("FA Home Timeline Resilience", () => {
  test("timeline has consistent structure and semantic date nodes", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#timeline")).toBeVisible();

    const model = await page.evaluate(() => {
      const section = document.querySelector("#timeline");
      const items = Array.from(
        document.querySelectorAll("#timeline .timeline > li")
      ) as HTMLElement[];

      const invalidItems = items
        .map((item, index) => {
          const dateNode = item.querySelector(".timeline-content .date");
          const titleNode = item.querySelector(".timeline-content h3:not(.date)");
          const bodyNode = item.querySelector(".timeline-content p:not(.date)");
          return dateNode && titleNode && bodyNode
            ? null
            : { index, hasDate: !!dateNode, hasTitle: !!titleNode, hasBody: !!bodyNode };
        })
        .filter(Boolean);

      const invalidLinkRoles = Array.from(
        document.querySelectorAll("#timeline a[role='button']")
      ).map((link) => ({
        href: (link as HTMLAnchorElement).getAttribute("href") || "",
        text: ((link.textContent || "").trim()).slice(0, 60),
      }));

      const invalidTimelineLinks = Array.from(
        document.querySelectorAll<HTMLAnchorElement>("#timeline .timeline-content a")
      )
        .map((link) => {
          const text = (link.textContent || "").trim();
          const label = (link.getAttribute("aria-label") || "").trim();
          const title = (link.getAttribute("title") || "").trim();
          const role = (link.getAttribute("role") || "").trim();
          const href = (link.getAttribute("href") || "").trim();

          if (!href) {
            return { href, text: text.slice(0, 60), issue: "missing-href" };
          }
          if (role === "button") {
            return { href, text: text.slice(0, 60), issue: "button-role-on-link" };
          }
          if (!(text.length > 0 || label.length > 0 || title.length > 0)) {
            return { href, text: text.slice(0, 60), issue: "missing-accessible-name" };
          }
          return null;
        })
        .filter(Boolean);

      return {
        hasSection: !!section,
        itemCount: items.length,
        hasDateAsHeading: !!document.querySelector("#timeline .timeline-content h3.date"),
        invalidItems,
        invalidLinkRoles,
        invalidTimelineLinks,
      };
    });

    expect(model.hasSection).toBeTruthy();
    expect(model.itemCount).toBeGreaterThanOrEqual(10);
    expect(model.hasDateAsHeading).toBeFalsy();
    expect(model.invalidItems).toEqual([]);
    expect(model.invalidLinkRoles).toEqual([]);
    expect(model.invalidTimelineLinks).toEqual([]);
  });

  test("timeline event order remains chronological", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const order = await page.evaluate(() => {
      const times = Array.from(
        document.querySelectorAll<HTMLTimeElement>("#timeline .timeline .date time[datetime]")
      ).map((node) => node.getAttribute("datetime") || "");

      const parsed = times
        .map((value, index) => ({
          index,
          value,
          ts: Date.parse(value),
        }))
        .filter((entry) => !Number.isNaN(entry.ts));

      let isSorted = true;
      for (let i = 1; i < parsed.length; i++) {
        if (parsed[i].ts < parsed[i - 1].ts) {
          isSorted = false;
          break;
        }
      }

      return { count: parsed.length, isSorted };
    });

    expect(order.count).toBeGreaterThanOrEqual(8);
    expect(order.isSorted).toBeTruthy();
  });

  test("timeline key dates match expected localized labels", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const labelsByDatetime = await page.evaluate(() => {
      const result: Record<string, string> = {};
      document
        .querySelectorAll<HTMLTimeElement>("#timeline .timeline .date time[datetime]")
        .forEach((node) => {
          const key = (node.getAttribute("datetime") || "").trim();
          if (!key) {return;}
          result[key] = (node.textContent || "").trim();
        });
      return result;
    });

    expect(labelsByDatetime["2005-09-06"]).toContain("۱۵ شهریور ۱۳۸۴");
    expect(labelsByDatetime["2023-09-01"]).toContain("۱۰ شهریور ۱۴۰۲");
    expect(labelsByDatetime["2023-11-16"]).toContain("۲۵ آبان ۱۴۰۲");
    expect(labelsByDatetime["2024-03-12"]).toContain("۲۲ اسفند ۱۴۰۲");
    expect(labelsByDatetime["2025-11-01"]).toContain("۱۰ آبان ۱۴۰۴");
  });

  test("timeline remains visible and readable when AOS script fails", async ({ page }) => {
    await page.route("**/assets/vendor/aos/aos.min.js", (route) => route.abort());
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.locator("#timeline").scrollIntoViewIfNeeded();

    const timelineState = await page.evaluate(() => {
      const section = document.querySelector("#timeline");
      const firstItem = document.querySelector("#timeline .timeline > li");
      if (!section || !firstItem) {return null;}
      const sectionStyle = getComputedStyle(section);
      const firstItemStyle = getComputedStyle(firstItem);
      return {
        aosDisabled: document.documentElement.classList.contains("aos-disabled"),
        sectionOpacity: sectionStyle.opacity,
        itemOpacity: firstItemStyle.opacity,
      };
    });

    expect(timelineState).not.toBeNull();
    expect(timelineState?.aosDisabled).toBeTruthy();
    expect(timelineState?.sectionOpacity).not.toBe("0");
    expect(timelineState?.itemOpacity).not.toBe("0");
  });

  test("timeline remains visible in no-JS mode", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.locator("#timeline").scrollIntoViewIfNeeded();
    await expect(page.locator("#timeline")).toBeVisible();

    const noJsState = await page.evaluate(() => {
      const firstItem = document.querySelector("#timeline .timeline > li");
      if (!firstItem) {return null;}
      const style = getComputedStyle(firstItem);
      return { opacity: style.opacity, transform: style.transform };
    });

    expect(noJsState).not.toBeNull();
    expect(noJsState?.opacity).not.toBe("0");
    await context.close();
  });

  test("timeline stays stable on mobile portrait and landscape", async ({ page }) => {
    const viewports = [
      { width: 320, height: 640 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
      await page.locator("#timeline").scrollIntoViewIfNeeded();

      const layout = await page.evaluate(() => {
        const timeline = document.querySelector("#timeline .timeline") as HTMLElement | null;
        const cards = Array.from(
          document.querySelectorAll("#timeline .timeline .timeline-content")
        ) as HTMLElement[];
        const icons = Array.from(
          document.querySelectorAll("#timeline .timeline .timeline-icon")
        ) as HTMLElement[];

        if (!timeline || cards.length === 0 || icons.length === 0) {
          return { valid: false };
        }

        const viewportWidth = window.innerWidth;
        const rootOverflow = document.documentElement.scrollWidth - viewportWidth;
        const offscreenCards = cards.some((card) => {
          const rect = card.getBoundingClientRect();
          return rect.right < 0 || rect.left > viewportWidth;
        });
        const offscreenIcons = icons.some((icon) => {
          const rect = icon.getBoundingClientRect();
          return rect.right < 0 || rect.left > viewportWidth;
        });

        return {
          valid: true,
          rootOverflow,
          offscreenCards,
          offscreenIcons,
        };
      });

      expect(layout.valid).toBeTruthy();
      expect(layout.rootOverflow).toBeLessThanOrEqual(2);
      expect(layout.offscreenCards).toBeFalsy();
      expect(layout.offscreenIcons).toBeFalsy();
    }
  });

  test("timeline external links are keyboard-focusable and keep link semantics", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.locator("#timeline").scrollIntoViewIfNeeded();

    const links = page.locator("#timeline .timeline-content .card-links a");
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", /^https?:\/\//);
      await expect(link).not.toHaveAttribute("role", "button");
      await link.focus();
      await expect(link).toBeFocused();

      const accessibleNameLength = await link.evaluate((node) => {
        const text = (node.textContent || "").trim();
        const label = (node.getAttribute("aria-label") || "").trim();
        const title = (node.getAttribute("title") || "").trim();
        return Math.max(text.length, label.length, title.length);
      });
      expect(accessibleNameLength).toBeGreaterThan(0);
    }
  });

  test("timeline card title contrast remains readable in dark mode", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.locator("#timeline").scrollIntoViewIfNeeded();

    const ratio = await page.evaluate(() => {
      const card = document.querySelector("#timeline .timeline-content");
      const heading = document.querySelector("#timeline .timeline-content h3:not(.date)");
      if (!card || !heading) {return 0;}

      const parseRgb = (input: string) => {
        const match = input.match(/rgba?\(([^)]+)\)/i);
        if (!match) {return null;}
        const [r, g, b] = match[1]
          .split(",")
          .slice(0, 3)
          .map((value) => Number(value.trim()));
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
});


