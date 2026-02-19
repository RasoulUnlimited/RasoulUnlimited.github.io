import { expect, test } from "@playwright/test";

const HOME_PATH = "/index.html";

test.describe("FA Home Hero", () => {
  test("hero keeps horizontal layout integrity across key viewports", async ({ page }) => {
    const viewports = [
      { width: 1440, height: 900 },
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
        typingWrapperExists: !!document.querySelector("#hero .tagline .typing-wrapper"),
        particlesState: canvas?.getAttribute("data-particles-state") || "",
        tiltState: hero?.getAttribute("data-hero-tilt") || "",
      };
    });

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
});
