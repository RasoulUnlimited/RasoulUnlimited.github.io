import { expect, test, type Page } from "@playwright/test";

const HOME_PATH = "/index.html";

async function gotoHome(
  page: Page,
  waitUntil: "domcontentloaded" | "networkidle" = "networkidle"
) {
  await page.goto(HOME_PATH, { waitUntil });
}

test.describe("FA Home Accessibility and Integrity", () => {
  test("document language, landmarks, and section labelling stay coherent", async ({
    page,
  }) => {
    await gotoHome(page);

    const audit = await page.evaluate(() => {
      const html = document.documentElement;
      const mainElements = Array.from(document.querySelectorAll("main"));
      const navElements = Array.from(document.querySelectorAll("nav"));
      const sectionRegions = Array.from(
        document.querySelectorAll<HTMLElement>("section[role='region'][aria-labelledby]")
      );

      const unlabeledNavs = navElements
        .filter((nav) => !(nav.getAttribute("aria-label") || "").trim())
        .map((nav) => ({ id: nav.id || "", className: nav.className || "" }));

      const invalidRegions = sectionRegions
        .map((section) => {
          const labelledBy = (section.getAttribute("aria-labelledby") || "").trim();
          const labelSource = labelledBy ? document.getElementById(labelledBy) : null;
          const labelText = (labelSource?.textContent || "").trim();

          if (!labelledBy || !labelSource || !labelText) {
            return {
              sectionId: section.id || "",
              labelledBy,
              hasLabelSource: !!labelSource,
              labelText,
            };
          }

          return null;
        })
        .filter(Boolean);

      return {
        htmlLang: (html.getAttribute("lang") || "").trim(),
        htmlDir: (html.getAttribute("dir") || "").trim(),
        bodyLang: (document.body.getAttribute("data-lang") || "").trim(),
        mainCount: mainElements.length,
        h1Count: document.querySelectorAll("h1").length,
        navCount: navElements.length,
        unlabeledNavs,
        sectionRegionCount: sectionRegions.length,
        invalidRegions,
      };
    });

    expect(audit.htmlLang.toLowerCase()).toContain("fa");
    expect(audit.htmlDir).toBe("rtl");
    expect(audit.bodyLang).toBe("fa");
    expect(audit.mainCount).toBe(1);
    expect(audit.h1Count).toBe(1);
    expect(audit.navCount).toBeGreaterThanOrEqual(2);
    expect(audit.unlabeledNavs).toEqual([]);
    expect(audit.sectionRegionCount).toBeGreaterThanOrEqual(8);
    expect(audit.invalidRegions).toEqual([]);
  });

  test("skip-link moves keyboard focus to main content", async ({ page }) => {
    await gotoHome(page, "domcontentloaded");

    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();

    await page.keyboard.press("Enter");

    await expect
      .poll(async () => {
        return page.evaluate(() => document.activeElement?.id || "");
      })
      .toBe("main-content");

    await expect
      .poll(async () => {
        return page.evaluate(() => window.location.hash);
      })
      .toBe("#main-content");
  });

  test("mobile menu remains keyboard-operable and keeps expanded state in sync", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHome(page, "domcontentloaded");

    const hamburger = page.locator(".hamburger");
    const navLinks = page.locator("#primary-navigation");

    await hamburger.focus();
    await expect(hamburger).toBeFocused();
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Enter");
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    await expect(navLinks).toHaveClass(/active/);

    await page.keyboard.press("Enter");
    await expect(hamburger).toHaveAttribute("aria-expanded", "false");
    await expect(navLinks).not.toHaveClass(/active/);
  });

  test("FAQ search wiring stays accessible and live status reacts to filtering", async ({
    page,
  }) => {
    await gotoHome(page);

    const search = page.locator("#faq-search");
    const status = page.locator("#faq-search-status");
    const noResults = page.locator("#faq-no-results");
    const clearButton = page.locator("#clear-search");

    await expect(search).toHaveAttribute("aria-controls", "faq-container");
    await expect(search).toHaveAttribute("aria-describedby", "faq-search-status");
    await expect(status).toHaveAttribute("aria-live", "polite");

    const initialStatus = ((await status.textContent()) || "").trim();

    await search.fill("zzzz-not-found-keyword");
    await page.waitForTimeout(450);
    await expect(noResults).toBeVisible();

    await expect
      .poll(async () => {
        return ((await status.textContent()) || "").trim();
      })
      .not.toBe(initialStatus);

    await page.evaluate(() => {
      const clear = document.getElementById("clear-search");
      if (clear instanceof HTMLButtonElement) {
        clear.click();
      }
    });
    await expect(noResults).toBeHidden();
    await expect(search).toHaveValue("");
  });

  test("FAQ accordion headers are keyboard-operable and preserve ARIA linkage", async ({
    page,
  }) => {
    await gotoHome(page);

    const header = page.locator("#faq-item-fa-1 .accordion-header");
    const panel = page.locator("#faq-answer-fa-1");

    await expect(header).toHaveAttribute("role", "button");
    await expect(header).toHaveAttribute("tabindex", "0");
    await expect(header).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toHaveAttribute("aria-hidden", "true");

    await header.focus();
    await page.keyboard.press("Enter");
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toHaveAttribute("aria-hidden", "false");

    await page.keyboard.press(" ");
    await expect(header).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toHaveAttribute("aria-hidden", "true");

    const linkage = await page.evaluate(() => {
      const item = document.getElementById("faq-item-fa-1");
      const question = document.getElementById("faq-question-fa-1");
      const controlledPanel = document.getElementById("faq-answer-fa-1");
      const panelLabelledBy = controlledPanel?.getAttribute("aria-labelledby") || "";
      const panelLabelSource = panelLabelledBy
        ? document.getElementById(panelLabelledBy)
        : null;
      return {
        itemLabelledBy: item?.getAttribute("aria-labelledby") || "",
        panelLabelledBy,
        panelLabelSourceExists: !!panelLabelSource,
        panelLabelSourceText: (panelLabelSource?.textContent || "").trim(),
        questionId: question?.id || "",
      };
    });

    expect(linkage.itemLabelledBy).toBe(linkage.questionId);
    expect(linkage.panelLabelledBy.length).toBeGreaterThan(0);
    expect(linkage.panelLabelSourceExists).toBeTruthy();
    expect(linkage.panelLabelSourceText.length).toBeGreaterThan(0);
  });

  test("all ARIA id references resolve to existing IDs", async ({ page }) => {
    await gotoHome(page);

    const brokenReferences = await page.evaluate(() => {
      const idRefAttributes = [
        "aria-activedescendant",
        "aria-controls",
        "aria-describedby",
        "aria-details",
        "aria-errormessage",
        "aria-flowto",
        "aria-labelledby",
        "aria-owns",
        "for",
      ];

      const issues: Array<{
        attr: string;
        targetId: string;
        value: string;
        tag: string;
        id: string;
      }> = [];

      for (const attr of idRefAttributes) {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(`[${attr}]`));

        for (const element of elements) {
          const raw = (element.getAttribute(attr) || "").trim();
          if (!raw) {continue;}

          const ids = raw.split(/\s+/).filter(Boolean);
          for (const targetId of ids) {
            if (!document.getElementById(targetId)) {
              issues.push({
                attr,
                targetId,
                value: raw,
                tag: element.tagName.toLowerCase(),
                id: element.id || "",
              });
            }
          }
        }
      }

      return issues;
    });

    expect(brokenReferences).toEqual([]);
  });

  test("page has no duplicate element IDs", async ({ page }) => {
    await gotoHome(page);

    const duplicates = await page.evaluate(() => {
      const idMap = new Map<string, number>();
      document.querySelectorAll<HTMLElement>("[id]").forEach((el) => {
        const id = (el.id || "").trim();
        if (!id) {return;}
        idMap.set(id, (idMap.get(id) || 0) + 1);
      });
      return Array.from(idMap.entries())
        .filter(([, count]) => count > 1)
        .map(([id, count]) => ({ id, count }));
    });

    expect(duplicates).toEqual([]);
  });

  test("interactive controls expose accessible names", async ({ page }) => {
    await gotoHome(page);

    const result = await page.evaluate(() => {
      const selectors = [
        "a[href]",
        "button",
        "input:not([type='hidden'])",
        "select",
        "textarea",
        "[role='button']",
        "[role='link']",
      ];

      const controls = Array.from(
        new Set(
          selectors.flatMap((selector) =>
            Array.from(document.querySelectorAll<HTMLElement>(selector))
          )
        )
      );

      const isHidden = (element: HTMLElement) => {
        if (element.hidden) {return true;}
        const style = window.getComputedStyle(element);
        return style.display === "none" || style.visibility === "hidden";
      };

      const getLabelledByText = (element: HTMLElement) => {
        const ids = (element.getAttribute("aria-labelledby") || "")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        if (!ids.length) {return "";}

        return ids
          .map((id) => (document.getElementById(id)?.textContent || "").trim())
          .filter(Boolean)
          .join(" ")
          .trim();
      };

      const getAccessibleName = (element: HTMLElement) => {
        const ariaLabel = (element.getAttribute("aria-label") || "").trim();
        if (ariaLabel) {return ariaLabel;}

        const labelledBy = getLabelledByText(element);
        if (labelledBy) {return labelledBy;}

        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          const labelsText = Array.from(element.labels || [])
            .map((label) => (label.textContent || "").trim())
            .join(" ")
            .trim();
          if (labelsText) {return labelsText;}

          const value = (element.value || "").trim();
          if (
            element instanceof HTMLInputElement &&
            ["button", "submit", "reset"].includes(element.type) &&
            value
          ) {
            return value;
          }

          const title = (element.getAttribute("title") || "").trim();
          if (title) {return title;}

          const placeholder = (element.getAttribute("placeholder") || "").trim();
          if (placeholder) {return placeholder;}
        }

        const title = (element.getAttribute("title") || "").trim();
        if (title) {return title;}

        const text = (element.textContent || "").replace(/\s+/g, " ").trim();
        if (text) {return text;}

        return "";
      };

      const missingNames = controls
        .filter((element) => !isHidden(element))
        .filter((element) => {
          if (element.matches("[disabled], [aria-disabled='true']")) {return false;}
          if (element.closest("[aria-hidden='true']")) {return false;}
          return true;
        })
        .map((element) => {
          const name = getAccessibleName(element);
          if (name) {return null;}

          return {
            tag: element.tagName.toLowerCase(),
            id: element.id || "",
            className: element.className || "",
            role: element.getAttribute("role") || "",
            href:
              element instanceof HTMLAnchorElement
                ? element.getAttribute("href") || ""
                : "",
            type:
              element instanceof HTMLInputElement || element instanceof HTMLButtonElement
                ? element.type
                : "",
          };
        })
        .filter(Boolean);

      return {
        checkedControls: controls.length,
        missingNames,
      };
    });

    expect(result.checkedControls).toBeGreaterThan(40);
    expect(result.missingNames).toEqual([]);
  });

  test("focusable elements are not placed inside aria-hidden containers", async ({
    page,
  }) => {
    await gotoHome(page);

    const hiddenFocusable = await page.evaluate(() => {
      const focusableSelector = [
        "a[href]",
        "button",
        "input:not([type='hidden'])",
        "select",
        "textarea",
        "[role='button']",
        "[tabindex]:not([tabindex='-1'])",
      ].join(",");

      return Array.from(document.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((el) => !el.matches("[disabled], [aria-disabled='true']"))
        .filter((el) => {
          if (el.hidden) {return false;}
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") {
            return false;
          }
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .filter((el) => !!el.closest("[aria-hidden='true']"))
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          className: el.className || "",
        }));
    });

    expect(hiddenFocusable).toEqual([]);
  });

  test("all buttons have explicit and valid type attributes", async ({ page }) => {
    await gotoHome(page);

    const invalidButtons = await page.evaluate(() => {
      const validTypes = new Set(["button", "submit", "reset"]);
      return Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
        .map((button) => {
          const typeAttr = (button.getAttribute("type") || "").trim().toLowerCase();
          const isValid = typeAttr.length > 0 && validTypes.has(typeAttr);
          if (isValid) {return null;}
          return {
            id: button.id || "",
            className: button.className || "",
            type: typeAttr,
            text: (button.textContent || "").replace(/\s+/g, " ").trim(),
          };
        })
        .filter(Boolean);
    });

    expect(invalidButtons).toEqual([]);
  });

  test("target=_blank links include both noopener and noreferrer", async ({ page }) => {
    await gotoHome(page);

    const insecureLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLAnchorElement>("a[target='_blank']"))
        .map((link) => {
          const relTokens = (link.getAttribute("rel") || "")
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);
          const hasNoopener = relTokens.includes("noopener");
          const hasNoreferrer = relTokens.includes("noreferrer");

          if (hasNoopener && hasNoreferrer) {return null;}

          return {
            href: link.href,
            rel: link.getAttribute("rel") || "",
            ariaLabel: link.getAttribute("aria-label") || "",
          };
        })
        .filter(Boolean);
    });

    expect(insecureLinks).toEqual([]);
  });

  test("images keep meaningful alt text unless intentionally decorative", async ({ page }) => {
    await gotoHome(page);

    const audit = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
      const missingAlt = images
        .map((image) => {
          const alt = (image.getAttribute("alt") || "").trim();
          const role = (image.getAttribute("role") || "").trim().toLowerCase();
          const decorative = role === "presentation" || role === "none" || image.getAttribute("aria-hidden") === "true";

          if (decorative) {return null;}
          if (alt.length > 0) {return null;}

          return {
            src: image.getAttribute("src") || "",
            id: image.id || "",
            className: image.className || "",
          };
        })
        .filter(Boolean);

      return {
        imageCount: images.length,
        missingAlt,
      };
    });

    expect(audit.imageCount).toBeGreaterThan(5);
    expect(audit.missingAlt).toEqual([]);
  });

  test("progressbar keeps bounded aria values when scrolling", async ({ page }) => {
    await gotoHome(page, "domcontentloaded");

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const progress = document.getElementById("scroll-progress-bar");
          if (!progress) {return null;}

          return {
            now: progress.getAttribute("aria-valuenow"),
            min: progress.getAttribute("aria-valuemin"),
            max: progress.getAttribute("aria-valuemax"),
          };
        });
      })
      .not.toBeNull();

    const afterScroll = await page.evaluate(() => {
      const progress = document.getElementById("scroll-progress-bar");
      if (!progress) {return null;}
      return {
        now: progress.getAttribute("aria-valuenow"),
        min: progress.getAttribute("aria-valuemin"),
        max: progress.getAttribute("aria-valuemax"),
      };
    });

    expect(afterScroll).not.toBeNull();
    const min = Number(afterScroll?.min || "0");
    const max = Number(afterScroll?.max || "100");
    const now = Number(afterScroll?.now || "0");

    expect(Number.isFinite(min)).toBeTruthy();
    expect(Number.isFinite(max)).toBeTruthy();
    expect(Number.isFinite(now)).toBeTruthy();
    expect(max).toBeGreaterThan(min);
    expect(now).toBeGreaterThanOrEqual(min);
    expect(now).toBeLessThanOrEqual(max);
  });

  test("author meta remains unique after scripts execute", async ({ page }) => {
    await gotoHome(page);

    const authorMetaCount = await page.locator('meta[name="author"]').count();
    expect(authorMetaCount).toBe(1);
  });

  test("hero profile image avoids redundant aria-label while keeping alt text", async ({ page }) => {
    await gotoHome(page);

    const imageA11y = await page.evaluate(() => {
      const image = document.querySelector("#hero .profile-image");
      if (!(image instanceof HTMLImageElement)) {
        return null;
      }

      return {
        alt: image.getAttribute("alt") || "",
        ariaLabel: image.getAttribute("aria-label") || "",
      };
    });

    expect(imageA11y).not.toBeNull();
    expect((imageA11y?.alt || "").trim().length).toBeGreaterThan(0);
    expect((imageA11y?.ariaLabel || "").trim()).toBe("");
  });
});
