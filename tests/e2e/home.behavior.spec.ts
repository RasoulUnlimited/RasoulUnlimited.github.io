import { expect, test, type Page } from "@playwright/test";

const HOME_PATH = "/index.html";

async function getVisibleFaqItemIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>("#faq-container .faq-item"));
    return items
      .filter((item) => !item.hidden && item.style.display !== "none")
      .map((item) => item.id);
  });
}

test.describe("FA Home Behavior", () => {
  test("loads homepage without page errors or request failures", async ({ page }) => {
    const pageErrors: string[] = [];
    const requestFailures: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(String(error));
    });

    page.on("requestfailed", (request) => {
      requestFailures.push(
        `${request.method()} ${request.url()} => ${request.failure()?.errorText || "unknown"}`
      );
    });

    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    await expect(page).toHaveTitle(/Rasoul Unlimited/);
    await expect(page.locator("#main-content")).toBeVisible();
    expect(pageErrors).toEqual([]);
    expect(requestFailures).toEqual([]);
  });

  test("homepage stays usable when Font Awesome CDNs are unreachable", async ({ page }) => {
    await page.route("**/cdnjs.cloudflare.com/ajax/libs/font-awesome/**", (route) =>
      route.abort()
    );
    await page.route("**/cdn.jsdelivr.net/npm/@fortawesome/**", (route) =>
      route.abort()
    );
    await page.route("**/use.fontawesome.com/releases/**", (route) =>
      route.abort()
    );

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const degraded = document.documentElement.classList.contains("icons-degraded");
          const hasFont = !!(
            document.fonts &&
            typeof document.fonts.check === "function" &&
            document.fonts.check('1em "Font Awesome 6 Free"')
          );
          return degraded || hasFont;
        });
      }, { timeout: 7000 })
      .toBeTruthy();

    await expect(page.locator("#main-content")).toBeVisible();
    await page.locator('.nav-links a[href="#about"]').first().click();
    await expect(page.locator("#about")).toBeVisible();
  });

  test("mobile navigation toggles menu state and aria attributes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const hamburger = page.locator(".hamburger");
    const navLinks = page.locator(".nav-links");
    const aboutLink = page.locator('.nav-links a[href="#about"]');

    await expect(hamburger).toBeVisible();
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");

    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    await expect(navLinks).toHaveClass(/active/);

    await aboutLink.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    await expect(navLinks).not.toHaveClass(/active/);
  });

  test("mobile navigation closes when clicking outside menu container", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const hamburger = page.locator(".hamburger");
    const navLinks = page.locator(".nav-links");

    await hamburger.click();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    await expect(navLinks).toHaveClass(/active/);

    await page.mouse.click(8, 8);
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    await expect(navLinks).not.toHaveClass(/active/);
  });

  test("anchor navigation updates hash and brings target section into viewport", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    await page.locator('.nav-links a[href="#projects"]').click();

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const target = document.getElementById("projects");
          const navbar = document.querySelector(".navbar");
          const progress = document.getElementById("scroll-progress-bar");
          if (!(target instanceof HTMLElement)) {
            return null;
          }

          const rect = target.getBoundingClientRect();
          return {
            hash: window.location.hash,
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
            viewportHeight: window.innerHeight,
            navHeight: navbar instanceof HTMLElement ? navbar.offsetHeight : 0,
            progressHeight: progress instanceof HTMLElement ? progress.offsetHeight : 0,
          };
        });
      })
      .not.toBeNull();

    const position = await page.evaluate(() => {
      const target = document.getElementById("projects");
      const navbar = document.querySelector(".navbar");
      const progress = document.getElementById("scroll-progress-bar");
      if (!(target instanceof HTMLElement)) {
        return null;
      }

      const rect = target.getBoundingClientRect();
      return {
        hash: window.location.hash,
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        viewportHeight: window.innerHeight,
        navHeight: navbar instanceof HTMLElement ? navbar.offsetHeight : 0,
        progressHeight: progress instanceof HTMLElement ? progress.offsetHeight : 0,
      };
    });

    expect(position).not.toBeNull();
    expect(position?.hash).toBe("#projects");
    expect(position?.top || 9999).toBeLessThan((position?.viewportHeight || 0) * 0.8);
    expect(position?.top || -9999).toBeGreaterThan(-40);
    expect(position?.bottom || 0).toBeGreaterThan((position?.navHeight || 0) + (position?.progressHeight || 0) + 20);
  });

  test("about section uses semantic structure and dedicated CTA classes", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const about = page.locator("#about");
    await expect(about).toBeVisible();
    await expect(about.locator(".about-actions .about-btn")).toHaveCount(2);
    await expect(about.locator(".about-actions .hero-btn")).toHaveCount(0);
    await expect(about.locator(".about-cards .info-card h3")).toHaveCount(3);
    await expect(about.locator(".about-cards .info-card h4")).toHaveCount(0);

    const semantics = await page.evaluate(() => {
      const stats = document.querySelector("#about .about-stats");
      const cards = document.querySelector("#about .about-cards");
      const subtitle = document.querySelector("#about .about-subtitle");

      return {
        statsTag: stats?.tagName || "",
        cardsTag: cards?.tagName || "",
        subtitleAlign: subtitle ? getComputedStyle(subtitle).textAlign : "",
      };
    });

    expect(semantics.statsTag).toBe("UL");
    expect(semantics.cardsTag).toBe("UL");
    expect(semantics.subtitleAlign).toBe("center");
  });

  test("about CTA buttons become full-width and stacked on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#about .about-actions .about-btn");

    const metrics = await page.evaluate(() => {
      const actions = document.querySelector("#about .about-actions");
      const buttons = Array.from(
        document.querySelectorAll("#about .about-actions .about-btn")
      ) as HTMLElement[];
      const actionsStyle = actions ? getComputedStyle(actions) : null;
      const actionsWidth = actions
        ? Math.round(actions.getBoundingClientRect().width)
        : 0;

      return {
        actionsFlexDirection: actionsStyle?.flexDirection || "",
        actionsWidth,
        buttons: buttons.map((btn) => ({
          width: Math.round(btn.getBoundingClientRect().width),
          minHeight: parseFloat(getComputedStyle(btn).minHeight || "0"),
        })),
      };
    });

    expect(metrics.actionsFlexDirection).toBe("column");
    expect(metrics.buttons.length).toBe(2);
    metrics.buttons.forEach((btn) => {
      expect(btn.width).toBeGreaterThanOrEqual(metrics.actionsWidth - 6);
      expect(btn.minHeight).toBeGreaterThanOrEqual(44);
    });
  });

  test("about section remains visible when JavaScript is disabled", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#about")).toBeVisible();

    const aboutStyle = await page.evaluate(() => {
      const section = document.querySelector("#about");
      if (!section) {return null;}
      const s = getComputedStyle(section);
      return { opacity: s.opacity, transform: s.transform };
    });

    expect(aboutStyle).not.toBeNull();
    expect(aboutStyle?.opacity).not.toBe("0");
    expect(aboutStyle?.transform).toBe("none");
    await context.close();
  });

  test("about section remains visible if AOS script fails to load", async ({ page }) => {
    await page.route("**/assets/vendor/aos/aos.min.js", (route) => route.abort());
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);

    const isFallbackEnabled = await page.evaluate(() =>
      document.documentElement.classList.contains("aos-disabled")
    );
    expect(isFallbackEnabled).toBeTruthy();
    await expect(page.locator("#about")).toBeVisible();

    const aboutOpacity = await page.locator("#about").evaluate((el) =>
      getComputedStyle(el).opacity
    );
    expect(aboutOpacity).not.toBe("0");
  });

  test("about card headings keep readable contrast in dark mode", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);

    const ratio = await page.evaluate(() => {
      const card = document.querySelector("#about .info-card");
      const heading = document.querySelector("#about .info-card h3");
      if (!card || !heading) {return 0;}

      const parseRgb = (input: string) => {
        const match = input.match(/rgba?\(([^)]+)\)/i);
        if (!match) {return null;}
        const [r, g, b] = match[1]
          .split(",")
          .slice(0, 3)
          .map((v) => Number(v.trim()));
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

  test("theme toggle updates current theme state", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    const beforeTheme = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme") || ""
    );

    await page.evaluate(() => {
      const toggle = document.getElementById("theme-toggle");
      if (toggle instanceof HTMLInputElement) {
        toggle.click();
      }
    });

    await expect
      .poll(async () => {
        return page.evaluate(
          () => document.documentElement.getAttribute("data-theme") || ""
        );
      })
      .not.toBe(beforeTheme);

    const afterTheme = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme") || ""
    );
    expect(["dark", "light"]).toContain(afterTheme);

    const storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(["dark", "light"]).toContain(storedTheme || "");
  });

  test("saved theme in localStorage is applied on initial load", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    await expect
      .poll(async () => {
        return page.evaluate(() => ({
          isDark: document.body.classList.contains("dark-mode"),
          isLight: document.body.classList.contains("light-mode"),
          toggleChecked:
            (document.getElementById("theme-toggle") as HTMLInputElement | null)
              ?.checked || false,
        }));
      })
      .toEqual({
        isDark: true,
        isLight: false,
        toggleChecked: true,
      });
  });

  test("theme follows system color scheme when no explicit localStorage preference exists", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.removeItem("theme"));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    await expect
      .poll(async () => {
        return page.evaluate(() => ({
          darkClass: document.body.classList.contains("dark-mode"),
          lightClass: document.body.classList.contains("light-mode"),
          storedTheme: localStorage.getItem("theme"),
        }));
      })
      .toEqual({
        darkClass: true,
        lightClass: false,
        storedTheme: null,
      });

    await page.emulateMedia({ colorScheme: "light" });

    await expect
      .poll(async () => {
        return page.evaluate(() => ({
          darkClass: document.body.classList.contains("dark-mode"),
          lightClass: document.body.classList.contains("light-mode"),
          storedTheme: localStorage.getItem("theme"),
        }));
      })
      .toEqual({
        darkClass: false,
        lightClass: true,
        storedTheme: null,
      });
  });

  test("explicit user theme preference is not overridden by later system theme changes", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.removeItem("theme"));
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      const toggle = document.getElementById("theme-toggle");
      if (toggle instanceof HTMLInputElement) {
        toggle.click();
      }
    });

    await expect
      .poll(async () => {
        return page.evaluate(() => ({
          storedTheme: localStorage.getItem("theme"),
          darkClass: document.body.classList.contains("dark-mode"),
          lightClass: document.body.classList.contains("light-mode"),
        }));
      })
      .toEqual({
        storedTheme: "light",
        darkClass: false,
        lightClass: true,
      });

    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });

    await expect
      .poll(async () => {
        return page.evaluate(() => ({
          storedTheme: localStorage.getItem("theme"),
          darkClass: document.body.classList.contains("dark-mode"),
          lightClass: document.body.classList.contains("light-mode"),
        }));
      })
      .toEqual({
        storedTheme: "light",
        darkClass: false,
        lightClass: true,
      });
  });

  test("theme preference persists after reload", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      const toggle = document.getElementById("theme-toggle");
      if (toggle instanceof HTMLInputElement) {
        toggle.click();
      }
    });

    const storedTheme = await page.evaluate(() => localStorage.getItem("theme") || "");
    expect(["dark", "light"]).toContain(storedTheme);

    await page.reload({ waitUntil: "domcontentloaded" });

    const stateAfterReload = await page.evaluate(() => {
      const toggle = document.getElementById("theme-toggle") as HTMLInputElement | null;
      return {
        storedTheme: localStorage.getItem("theme") || "",
        darkClass: document.body.classList.contains("dark-mode"),
        lightClass: document.body.classList.contains("light-mode"),
        checked: !!toggle?.checked,
      };
    });

    expect(stateAfterReload.storedTheme).toBe(storedTheme);
    if (storedTheme === "dark") {
      expect(stateAfterReload.darkClass).toBeTruthy();
      expect(stateAfterReload.lightClass).toBeFalsy();
      expect(stateAfterReload.checked).toBeTruthy();
    } else {
      expect(stateAfterReload.lightClass).toBeTruthy();
      expect(stateAfterReload.darkClass).toBeFalsy();
      expect(stateAfterReload.checked).toBeFalsy();
    }
  });

  test("scrolling shows floating action buttons and updates progress", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await expect(page.locator("#scroll-to-top")).toHaveClass(/visible/);
    await expect(page.locator("#share-page-button")).toHaveClass(/visible/);

    const progressValue = await page
      .locator("#scroll-progress-bar")
      .getAttribute("aria-valuenow");
    expect(Number(progressValue || "0")).toBeGreaterThan(0);
  });

  test("scroll-to-top button returns page near top", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const topBtn = page.locator("#scroll-to-top");
    await expect(topBtn).toHaveClass(/visible/);
    await topBtn.click();

    await expect
      .poll(async () => {
        return page.evaluate(() => window.scrollY);
      })
      .toBeLessThan(20);
  });

  test("share button falls back to clipboard copy when Web Share API is unavailable", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as any).__copiedText = "";
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as any).__copiedText = text;
          },
        },
      });
    });

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const shareBtn = page.locator("#share-page-button");
    await expect(shareBtn).toHaveClass(/visible/);
    await shareBtn.click();

    await expect
      .poll(async () => {
        return page.evaluate(() => (window as any).__copiedText || "");
      })
      .toBe(page.url());

    await expect(page.locator("#share-copy-toast")).toBeVisible();
  });

  test("share button uses Web Share API with page title and URL when available", async ({
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

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const shareBtn = page.locator("#share-page-button");
    await expect(shareBtn).toHaveClass(/visible/);
    await shareBtn.click();

    await expect
      .poll(async () => {
        return page.evaluate(() => (window as any).__sharePayload);
      })
      .not.toBeNull();

    const payload = await page.evaluate(() => (window as any).__sharePayload);
    expect(payload?.title).toBeTruthy();
    expect(payload?.url).toBe(page.url());
    await expect(page.locator("#share-success-toast")).toBeVisible();
  });

  test("share button ignores AbortError from Web Share API without error toast", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async () => {
          const error = new Error("share aborted");
          error.name = "AbortError";
          throw error;
        },
      });
    });

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const shareBtn = page.locator("#share-page-button");
    await expect(shareBtn).toHaveClass(/visible/);
    await shareBtn.click();

    await expect(page.locator("#share-error-toast")).toHaveCount(0);
    await expect(page.locator("#share-success-toast")).toHaveCount(0);
  });

  test("share button shows error toast when Web Share API fails unexpectedly", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async () => {
          throw new Error("share failure");
        },
      });
    });

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const shareBtn = page.locator("#share-page-button");
    await expect(shareBtn).toHaveClass(/visible/);
    await shareBtn.click();

    await expect(page.locator("#share-error-toast")).toBeVisible();
  });

  test("faq supports accordion interaction and search filtering", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const firstItem = page.locator("#faq-container .faq-item").first();
    const firstHeader = firstItem.locator(".accordion-header");
    const firstAnswer = firstItem.locator(".accordion-content");
    const searchInput = page.locator("#faq-search");
    const clearButton = page.locator("#clear-search");

    await firstHeader.click();
    await expect(firstHeader).toHaveAttribute("aria-expanded", "true");
    await expect(firstAnswer).toHaveAttribute("aria-hidden", "false");

    await searchInput.fill("doi");
    await page.waitForTimeout(450);

    const visibleItems = page.locator("#faq-container .faq-item:not([hidden])");
    await expect(visibleItems).toHaveCount(1);
    await expect(visibleItems.first()).toHaveAttribute("id", "faq-item-fa-2");
    await expect(page.locator("#faq-no-results")).toBeHidden();
    await expect(clearButton).toBeVisible();
  });

  test("faq search shows no-results state and clear restores all items", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const searchInput = page.locator("#faq-search");
    const clearButton = page.locator("#clear-search");
    const noResults = page.locator("#faq-no-results");

    await searchInput.fill("zzzznotfoundterm");
    await page.waitForTimeout(450);

    await expect(noResults).toBeVisible();
    const visibleFiltered = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll<HTMLElement>("#faq-container .faq-item"));
      return items.filter((item) => !item.hidden && item.style.display !== "none").length;
    });
    expect(visibleFiltered).toBe(0);
    await expect(clearButton).toBeVisible();

    await page.evaluate(() => {
      const clear = document.getElementById("clear-search");
      if (clear instanceof HTMLButtonElement) {
        clear.click();
      }
    });
    await expect(noResults).toBeHidden();

    const visibleAfterClear = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll<HTMLElement>("#faq-container .faq-item"));
      return items.filter((item) => !item.hidden && item.style.display !== "none").length;
    });
    expect(visibleAfterClear).toBe(6);
  });

  test("faq search supports Escape to clear query and restore all entries", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const searchInput = page.locator("#faq-search");
    await searchInput.fill("doi");

    await expect
      .poll(async () => {
        const ids = await getVisibleFaqItemIds(page);
        return ids.length;
      })
      .toBe(1);

    await expect(page.locator("#faq .highlight-term").first()).toBeVisible();
    await searchInput.press("Escape");

    await expect(searchInput).toHaveValue("");
    await expect(page.locator("#clear-search")).not.toBeVisible();
    await expect(page.locator("#faq-no-results")).toBeHidden();

    await expect
      .poll(async () => {
        const ids = await getVisibleFaqItemIds(page);
        return ids.length;
      })
      .toBe(6);

    await expect(page.locator("#faq .highlight-term")).toHaveCount(0);
  });

  test("faq expand and collapse controls sync aria-pressed and open state", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const expandAll = page.locator("#expand-all-faq");
    const collapseAll = page.locator("#collapse-all-faq");
    const searchInput = page.locator("#faq-search");

    await searchInput.fill("doi");
    await expect
      .poll(async () => {
        const ids = await getVisibleFaqItemIds(page);
        return ids;
      })
      .toEqual(["faq-item-fa-2"]);

    await expandAll.click();
    await expect(expandAll).toHaveAttribute("aria-pressed", "true");
    await expect(collapseAll).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#faq-item-fa-2 .accordion-header")).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    await collapseAll.click();
    await expect(collapseAll).toHaveAttribute("aria-pressed", "true");
    await expect(expandAll).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("#faq-item-fa-2 .accordion-header")).toHaveAttribute(
      "aria-expanded",
      "false"
    );

    await page.locator("#clear-search").click();
    await expect(searchInput).toHaveValue("");
    await expect
      .poll(async () => {
        const ids = await getVisibleFaqItemIds(page);
        return ids.length;
      })
      .toBe(6);

    await expandAll.click();
    await expect(page.locator("#faq-container .faq-item .accordion-header[aria-expanded='true']")).toHaveCount(6);

    await collapseAll.click();
    await expect(page.locator("#faq-container .faq-item .accordion-header[aria-expanded='false']")).toHaveCount(6);
  });

  test("faq search normalizes Arabic/Persian letter variants for reliable matching", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    await page.locator("#faq-search").fill("همكاري");

    await expect
      .poll(async () => {
        return getVisibleFaqItemIds(page);
      })
      .not.toEqual([]);

    const ids = await getVisibleFaqItemIds(page);
    expect(ids).toContain("faq-item-fa-3");
    await expect(page.locator("#faq-item-fa-3 .accordion-header")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  test("faq deep-link hash opens target item on load", async ({ page }) => {
    await page.goto(`${HOME_PATH}#faq-item-fa-3`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const targetHeader = page.locator("#faq-item-fa-3 .accordion-header");
    const targetPanel = page.locator("#faq-answer-fa-3");

    await expect(targetHeader).toHaveAttribute("aria-expanded", "true");
    await expect(targetPanel).toHaveAttribute("aria-hidden", "false");
  });

  test("faq keyboard navigation supports Arrow/Home/End and Enter toggling", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const firstHeader = page.locator("#faq-item-fa-1 .accordion-header");
    const secondHeader = page.locator("#faq-item-fa-2 .accordion-header");
    const lastHeader = page.locator("#faq-item-fa-6 .accordion-header");

    await firstHeader.focus();
    await expect(firstHeader).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(secondHeader).toBeFocused();

    await page.keyboard.press("End");
    await expect(lastHeader).toBeFocused();

    await page.keyboard.press("Home");
    await expect(firstHeader).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(firstHeader).toHaveAttribute("aria-expanded", "true");
  });

  test("copy faq link button writes canonical faq hash URL", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__copiedFaqLink = "";
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as any).__copiedFaqLink = text;
          },
        },
      });
    });

    await page.goto(HOME_PATH, { waitUntil: "networkidle" });
    await page.locator('#faq-item-fa-1 .copy-faq-link').click();

    await expect
      .poll(async () => {
        return page.evaluate(() => (window as any).__copiedFaqLink || "");
      })
      .toMatch(/#faq-item-fa-1$/);
  });

  test("copy faq link excludes query params and keeps canonical pathname", async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__copiedFaqLink = "";
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as any).__copiedFaqLink = text;
          },
        },
      });
    });

    await page.goto(`${HOME_PATH}?utm_source=e2e`, { waitUntil: "networkidle" });
    await page.locator('#faq-item-fa-1 .copy-faq-link').click();

    await expect
      .poll(async () => {
        return page.evaluate(() => (window as any).__copiedFaqLink || "");
      })
      .not.toBe("");

    const copiedLink = await page.evaluate(() => (window as any).__copiedFaqLink || "");
    const parsed = new URL(copiedLink);
    expect(parsed.pathname).toBe("/index.html");
    expect(parsed.search).toBe("");
    expect(parsed.hash).toBe("#faq-item-fa-1");
  });

  test("faq feedback vote persists in localStorage and rehydrates on reload", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const firstHeader = page.locator("#faq-item-fa-1 .accordion-header");
    await firstHeader.click();
    await expect(firstHeader).toHaveAttribute("aria-expanded", "true");

    const upVote = page.locator("#faq-item-fa-1 .btn-feedback.up");
    await upVote.click({ force: true });

    const storedValue = await page.evaluate(() => localStorage.getItem("faq-feedback-faq-item-fa-1"));
    expect(storedValue).toBe("up");

    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("#faq-item-fa-1 .btn-feedback.up")).toHaveClass(/active/);
  });

  test("faq feedback enforces exclusive selection and resets transient UI label", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const firstHeader = page.locator("#faq-item-fa-1 .accordion-header");
    await firstHeader.click();
    await expect(firstHeader).toHaveAttribute("aria-expanded", "true");

    const label = page.locator("#faq-item-fa-1 .faq-feedback .feedback-label");
    const up = page.locator("#faq-item-fa-1 .btn-feedback.up");
    const down = page.locator("#faq-item-fa-1 .btn-feedback.down");

    const originalLabel = ((await label.textContent()) || "").trim();
    expect(originalLabel.length).toBeGreaterThan(0);

    await up.click({ force: true });
    await expect(up).toHaveClass(/active/);
    await expect
      .poll(async () => {
        return page.evaluate(() => localStorage.getItem("faq-feedback-faq-item-fa-1"));
      })
      .toBe("up");

    await down.click({ force: true });
    await expect(down).toHaveClass(/active/);
    await expect(up).not.toHaveClass(/active/);
    await expect
      .poll(async () => {
        return page.evaluate(() => localStorage.getItem("faq-feedback-faq-item-fa-1"));
      })
      .toBe("down");

    const duringMessage = ((await label.textContent()) || "").trim();
    expect(duringMessage).not.toBe(originalLabel);

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const labelEl = document.querySelector(
            "#faq-item-fa-1 .faq-feedback .feedback-label"
          );
          const downBtn = document.querySelector("#faq-item-fa-1 .btn-feedback.down");
          return {
            label: (labelEl?.textContent || "").trim(),
            downActive: !!downBtn?.classList.contains("active"),
          };
        });
      }, { timeout: 5000 })
      .toEqual({
        label: originalLabel,
        downActive: false,
      });
  });

  test("runtime error handler records errors and exposes degraded runtime state", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      const probe = new Error("e2e-runtime-probe");
      window.dispatchEvent(new ErrorEvent("error", { error: probe, message: probe.message }));
    });

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const raw = sessionStorage.getItem("runtimeErrors");
          const list = raw ? JSON.parse(raw) : [];
          return {
            isDegraded: document.documentElement.classList.contains("runtime-degraded"),
            count: Array.isArray(list) ? list.length : 0,
            hasProbe: Array.isArray(list)
              ? list.some(
                (entry) =>
                  entry &&
                    entry.scope === "window.error" &&
                    String(entry.message || "").includes("e2e-runtime-probe")
              )
              : false,
            dataCount: document.documentElement.dataset.runtimeErrorCount || "",
          };
        });
      })
      .toEqual({
        isDegraded: true,
        count: 1,
        hasProbe: true,
        dataCount: "1",
      });
  });

  test("home page keeps sw-register script disabled", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.locator('script[src*="sw-register"]')).toHaveCount(0);
  });
});
