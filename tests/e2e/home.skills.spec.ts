import { expect, test } from "@playwright/test";

const SKILL_PAGES = [
  { path: "/index.html", label: "fa" },
  { path: "/en/index.html", label: "en" },
] as const;

const EXPECTED_SKILL_COUNT = 30;
const EXPECTED_AI_DATA_COUNT = 4;

test.describe("Home Skills Section", () => {
  for (const item of SKILL_PAGES) {
    test(`${item.label}: renders modern skills block structure`, async ({ page }) => {
      await page.goto(item.path, { waitUntil: "networkidle" });
      await page.locator("#skills").scrollIntoViewIfNeeded();

      await expect(page.locator("#skills .skills-toolbar")).toBeVisible();
      await expect(page.locator("#skills .skills-filter")).toHaveCount(7);
      await expect(page.locator("#skills #skills-expand-toggle")).toBeVisible();
      await expect(page.locator("#skills .skills-list .skill-chip")).toHaveCount(
        EXPECTED_SKILL_COUNT
      );
      await expect(page.locator("#skills .skills-list .skill-chip .tier-badge")).toHaveCount(
        EXPECTED_SKILL_COUNT
      );

      const keys = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll<HTMLElement>("#skills .skills-list .skill-chip")
        ).map((chip) => chip.dataset.skillKey || "");
      });
      expect(keys.filter(Boolean).length).toBe(EXPECTED_SKILL_COUNT);
    });

    test(`${item.label}: tooltip appears on hover and hides on leave`, async ({ page }) => {
      await page.goto(item.path, { waitUntil: "networkidle" });
      await page.locator("#skills").scrollIntoViewIfNeeded();

      const chip = page.locator("#skills .skills-list .skill-chip").first();
      await chip.hover();

      const tooltip = chip.locator(".skill-hover-message");
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveClass(/show-message/);

      await page.mouse.move(0, 0);
      await expect
        .poll(async () => {
          return tooltip.evaluate((node) =>
            node.classList.contains("show-message")
          );
        })
        .toBeFalsy();
    });

    test(`${item.label}: keyboard focus and Escape manage tooltip accessibly`, async ({
      page,
    }) => {
      await page.goto(item.path, { waitUntil: "networkidle" });
      await page.locator("#skills").scrollIntoViewIfNeeded();

      const chip = page.locator("#skills .skills-list .skill-chip").first();
      await chip.focus();

      const tooltip = chip.locator(".skill-hover-message");
      await expect(tooltip).toBeVisible();
      await expect(chip).toHaveAttribute("aria-describedby", /skill-tooltip-/);

      await page.keyboard.press("Escape");
      await expect
        .poll(async () => {
          return tooltip.evaluate((node) =>
            node.classList.contains("show-message")
          );
        })
        .toBeFalsy();
    });

    test(`${item.label}: filter and collapse controls update visibility`, async ({
      page,
    }) => {
      await page.goto(item.path, { waitUntil: "networkidle" });
      await page.locator("#skills").scrollIntoViewIfNeeded();

      const toggle = page.locator("#skills-expand-toggle");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");

      const hiddenSecondaryBefore = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll<HTMLElement>(
            '#skills .skill-chip[data-skill-priority="secondary"]'
          )
        ).filter((chip) => getComputedStyle(chip).display === "none").length;
      });
      expect(hiddenSecondaryBefore).toBeGreaterThan(0);

      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");

      const hiddenSecondaryAfterExpand = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll<HTMLElement>(
            '#skills .skill-chip[data-skill-priority="secondary"]'
          )
        ).filter((chip) => getComputedStyle(chip).display === "none").length;
      });
      expect(hiddenSecondaryAfterExpand).toBe(0);

      await page.locator('#skills .skills-filter[data-filter="ai-data"]').click();
      const aiDataVisible = await page.evaluate(() => {
        const chips = Array.from(
          document.querySelectorAll<HTMLElement>("#skills .skill-chip")
        );
        const visible = chips.filter((chip) => getComputedStyle(chip).display !== "none");
        return {
          count: visible.length,
          groups: Array.from(new Set(visible.map((chip) => chip.dataset.skillGroup || ""))),
        };
      });

      expect(aiDataVisible.count).toBe(EXPECTED_AI_DATA_COUNT);
      expect(aiDataVisible.groups).toEqual(["ai-data"]);
    });
  }

  test("EN regression: tooltip stays floating and not in-flow after hover", async ({
    page,
  }) => {
    await page.goto("/en/index.html", { waitUntil: "networkidle" });
    await page.locator("#skills").scrollIntoViewIfNeeded();

    const chip = page.locator("#skills .skills-list .skill-chip").first();
    const before = await chip.evaluate((el) => ({
      display: getComputedStyle(el).display,
      listWidth: el.closest(".skills-list")?.getBoundingClientRect().width || 0,
    }));

    await chip.hover();
    await expect(chip.locator(".skill-hover-message")).toBeVisible();

    const after = await chip.locator(".skill-hover-message").evaluate((el) => {
      const chipEl = el.parentElement as HTMLElement | null;
      const listEl = chipEl?.closest(".skills-list") as HTMLElement | null;
      const cs = getComputedStyle(el);
      return {
        position: cs.position,
        pointerEvents: cs.pointerEvents,
        chipDisplay: chipEl ? getComputedStyle(chipEl).display : "",
        listWidth: listEl ? listEl.getBoundingClientRect().width : 0,
      };
    });

    expect(after.position).toBe("absolute");
    expect(after.pointerEvents).toBe("none");
    expect(after.chipDisplay).toBe(before.display);
    expect(Math.abs(after.listWidth - before.listWidth)).toBeLessThanOrEqual(1);
  });

  test("no-JS keeps skills section visible and intact in FA/EN", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    for (const item of SKILL_PAGES) {
      await page.goto(item.path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("#skills")).toBeVisible();
      await expect(page.locator("#skills .skill-chip")).toHaveCount(EXPECTED_SKILL_COUNT);

      const visibleCount = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll<HTMLElement>("#skills .skill-chip")
        ).filter((chip) => getComputedStyle(chip).display !== "none").length;
      });
      expect(visibleCount).toBe(EXPECTED_SKILL_COUNT);
    }

    await context.close();
  });

  test("reduced motion keeps skills interactions stable", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en/index.html", { waitUntil: "networkidle" });
    await page.locator("#skills").scrollIntoViewIfNeeded();

    const timings = await page.evaluate(() => {
      const parse = (v: string) =>
        Math.max(
          ...v.split(",").map((part) => {
            const raw = part.trim();
            if (raw.endsWith("ms")) {return Number(raw.replace("ms", ""));}
            if (raw.endsWith("s")) {return Number(raw.replace("s", "")) * 1000;}
            return 0;
          })
        );

      const chip = document.querySelector("#skills .skill-chip");
      const filter = document.querySelector("#skills .skills-filter");
      const toggle = document.querySelector("#skills-expand-toggle");

      return {
        chipMs: chip ? parse(getComputedStyle(chip).transitionDuration) : 999,
        filterMs: filter ? parse(getComputedStyle(filter).transitionDuration) : 999,
        toggleMs: toggle ? parse(getComputedStyle(toggle).transitionDuration) : 999,
      };
    });

    expect(timings.chipMs).toBeLessThanOrEqual(1);
    expect(timings.filterMs).toBeLessThanOrEqual(1);
    expect(timings.toggleMs).toBeLessThanOrEqual(1);
  });

  test("coarse pointer mode disables floating tooltip rendering", async ({ browser }) => {
    const context = await browser.newContext({
      isMobile: true,
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await page.goto("/en/index.html", { waitUntil: "networkidle" });
    await page.locator("#skills").scrollIntoViewIfNeeded();
    await page.locator("#skills .skill-chip").first().focus();
    await page.waitForTimeout(100);

    const tooltipState = await page.evaluate(() => {
      const mediaMatches =
        window.matchMedia("(hover: none)").matches ||
        window.matchMedia("(pointer: coarse)").matches;
      const chip = document.querySelector<HTMLElement>("#skills .skill-chip");
      const tip = chip?.querySelector<HTMLElement>(".skill-hover-message");
      return {
        mediaMatches,
        tooltipExists: !!tip,
        display: tip ? getComputedStyle(tip).display : "",
      };
    });

    expect(tooltipState.mediaMatches).toBeTruthy();
    expect(tooltipState.tooltipExists).toBeTruthy();
    expect(tooltipState.display).toBe("none");

    await context.close();
  });
});

