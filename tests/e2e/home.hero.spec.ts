import { expect, test } from "@playwright/test";

const HOME_PATH = "/index.html";

test.describe("FA Home Hero", () => {
  test("hero keeps horizontal layout integrity across key viewports", async ({ page }) => {
    const viewports = [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);

      const metrics = await page.evaluate(() => ({
        rootOverflow: document.documentElement.scrollWidth - window.innerWidth,
        heroExists: !!document.getElementById("hero"),
      }));

      expect(metrics.heroExists).toBeTruthy();
      expect(metrics.rootOverflow).toBeLessThanOrEqual(1);
    }
  });

  test("hero exposes motion mode state on runtime", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);

    const motionMode = await page.evaluate(() => {
      return document.getElementById("hero")?.getAttribute("data-hero-motion") || "";
    });

    expect(["full", "lite", "off"]).toContain(motionMode);
  });

  test("hero controls do not inherit global underline/link transitions", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);

    const styles = await page.evaluate(() => {
      const heroButtons = Array.from(
        document.querySelectorAll<HTMLElement>("#hero .hero-btn")
      ).map((el) => {
        const s = getComputedStyle(el);
        return {
          textDecoration: s.textDecorationLine,
          transition: s.transition,
          fontWeight: Number.parseInt(s.fontWeight, 10),
        };
      });

      const socialLinks = Array.from(
        document.querySelectorAll<HTMLElement>("#hero .hero-social-link")
      ).map((el) => {
        const s = getComputedStyle(el);
        return {
          textDecoration: s.textDecorationLine,
          transition: s.transition,
        };
      });

      return { heroButtons, socialLinks };
    });

    expect(styles.heroButtons.length).toBeGreaterThan(0);
    styles.heroButtons.forEach((btn) => {
      expect(btn.textDecoration).toBe("none");
      expect(btn.transition).toContain("transform");
      expect(btn.fontWeight).toBeGreaterThanOrEqual(700);
    });

    expect(styles.socialLinks.length).toBeGreaterThan(0);
    styles.socialLinks.forEach((link) => {
      expect(link.textDecoration).toBe("none");
      expect(link.transition).not.toContain("text-decoration 0.2s");
    });
  });

  test("scroll indicator becomes static on mobile widths", async ({ page }) => {
    const viewports = [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);

      const position = await page.evaluate(() => {
        const indicator = document.querySelector("#hero .scroll-down-indicator");
        return indicator ? getComputedStyle(indicator).position : "";
      });

      expect(position).toBe("static");
    }
  });

  test("reduced-motion mode disables typing animation and hero motion features", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(900);

    const state = await page.evaluate(() => {
      const canvas = document.getElementById("hero-particles");
      const hero = document.getElementById("hero");
      return {
        heroMotion: hero?.getAttribute("data-hero-motion") || "",
        typingWrapperExists: !!document.querySelector("#hero .tagline .typing-wrapper"),
        particlesState: canvas?.getAttribute("data-particles-state") || "",
        tiltState: hero?.getAttribute("data-hero-tilt") || "",
      };
    });

    expect(state.heroMotion).toBe("off");
    expect(state.typingWrapperExists).toBeFalsy();
    expect(state.particlesState).toBe("disabled");
    expect(state.tiltState).toBe("disabled");
    await context.close();
  });

  test("dark mode keeps primary hero CTA text readable", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);

    const color = await page.evaluate(() => {
      const primary = document.querySelector("#hero .hero-btn.primary");
      return primary ? getComputedStyle(primary).color : "";
    });

    expect(color).not.toBe("");
    expect(color).not.toBe("rgb(15, 23, 42)");
  });

  test("dark mode keeps secondary hero CTA contrast readable", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);

    const ratio = await page.evaluate(() => {
      const parseRgba = (input: string) => {
        const match = input.match(/rgba?\(([^)]+)\)/i);
        if (!match) {
          return null;
        }
        const nums = match[1]
          .split(",")
          .map((n) => Number(n.trim()))
          .filter((n) => !Number.isNaN(n));
        if (nums.length < 3) {
          return null;
        }
        return {
          r: nums[0],
          g: nums[1],
          b: nums[2],
          a: nums.length > 3 ? nums[3] : 1,
        };
      };

      const luminance = (rgb: { r: number; g: number; b: number }) => {
        const channel = (value: number) => {
          const v = value / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
      };

      const btn = document.querySelector("#hero .hero-btn.secondary");
      const hero = document.getElementById("hero");
      if (!(btn instanceof HTMLElement) || !(hero instanceof HTMLElement)) {
        return 0;
      }

      const fg = parseRgba(getComputedStyle(btn).color);
      const bg = parseRgba(getComputedStyle(btn).backgroundColor);
      const heroBg = parseRgba(getComputedStyle(hero).backgroundColor) || { r: 15, g: 23, b: 42, a: 1 };

      if (!fg || !bg) {
        return 0;
      }

      const alpha = Math.min(Math.max(bg.a, 0), 1);
      const blendedBg = {
        r: bg.r * alpha + heroBg.r * (1 - alpha),
        g: bg.g * alpha + heroBg.g * (1 - alpha),
        b: bg.b * alpha + heroBg.b * (1 - alpha),
      };

      const l1 = luminance({ r: fg.r, g: fg.g, b: fg.b });
      const l2 = luminance(blendedBg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
    });

    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  test("hero content remains visible with JavaScript disabled", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const visibility = await page.evaluate(() => {
      const hero = document.getElementById("hero");
      const tagline = document.querySelector("#hero .tagline");
      if (!hero || !tagline) {return null;}
      const heroStyle = getComputedStyle(hero);
      const taglineStyle = getComputedStyle(tagline);
      return {
        heroOpacity: heroStyle.opacity,
        taglineOpacity: taglineStyle.opacity,
        taglineDisplay: taglineStyle.display,
      };
    });

    expect(visibility).not.toBeNull();
    expect(visibility?.heroOpacity).not.toBe("0");
    expect(visibility?.taglineOpacity).not.toBe("0");
    expect(visibility?.taglineDisplay).toBe("block");
    await context.close();
  });

  test("hero schema and identity attributes stay intact", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const schema = await page.evaluate(() => {
      const hero = document.getElementById("hero");
      const heading = document.getElementById("hero-heading");
      const roleSpans = document.querySelectorAll(
        '#hero .tagline span[property="schema:jobTitle"]'
      );

      return {
        heroItemType: hero?.getAttribute("itemtype") || "",
        heroItemId: hero?.getAttribute("itemid") || "",
        headingItemProp: heading?.getAttribute("itemprop") || "",
        roleSpanCount: roleSpans.length,
      };
    });

    expect(schema.heroItemType).toBe("https://schema.org/Person");
    expect(schema.heroItemId).toContain("#person");
    expect(schema.headingItemProp).toBe("name");
    expect(schema.roleSpanCount).toBeGreaterThanOrEqual(3);
  });

  test("hero button styles do not bleed into connect resume CTA", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#connect .resume-download .full-width-btn");

    const styles = await page.evaluate(() => {
      const btn = document.querySelector("#connect .resume-download .full-width-btn");
      if (!(btn instanceof HTMLElement)) {
        return null;
      }
      const s = getComputedStyle(btn);
      return {
        radius: Number.parseFloat(s.borderTopLeftRadius || "0"),
        width: Math.round(btn.getBoundingClientRect().width),
      };
    });

    expect(styles).not.toBeNull();
    expect(styles?.radius || 0).toBeLessThan(40);
    expect(styles?.width || 0).toBeGreaterThan(200);
  });
});
