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

      return {
        hasSection: !!section,
        itemCount: items.length,
        hasDateAsHeading: !!document.querySelector("#timeline .timeline-content h3.date"),
        invalidItems,
        invalidLinkRoles,
      };
    });

    expect(model.hasSection).toBeTruthy();
    expect(model.itemCount).toBeGreaterThanOrEqual(10);
    expect(model.hasDateAsHeading).toBeFalsy();
    expect(model.invalidItems).toEqual([]);
    expect(model.invalidLinkRoles).toEqual([]);
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
      expect(layout.rootOverflow).toBeLessThanOrEqual(1);
      expect(layout.offscreenCards).toBeFalsy();
      expect(layout.offscreenIcons).toBeFalsy();
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


