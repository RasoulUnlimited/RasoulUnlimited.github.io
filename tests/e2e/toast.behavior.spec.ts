import { expect, test, type Page } from "@playwright/test";

const HOME_PATH = "/index.html";
const EN_HOME_PATH = "/en/index.html";

async function clearToasts(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll(".dynamic-toast").forEach((node) => node.remove());
  });
}

async function swipeToast(page: Page, id: string, deltaX: number, deltaY: number) {
  await page.evaluate(
    ({ toastId, moveX, moveY }) => {
      const toast = document.getElementById(toastId);
      if (!(toast instanceof HTMLElement)) {
        return;
      }
      const rect = toast.getBoundingClientRect();
      const startX = rect.left + rect.width * 0.45;
      const startY = rect.top + rect.height * 0.5;
      const pointerId = 17;
      const base = {
        bubbles: true,
        cancelable: true,
        pointerType: "touch",
        isPrimary: true,
      };

      toast.dispatchEvent(
        new PointerEvent("pointerdown", {
          ...base,
          pointerId,
          button: 0,
          clientX: startX,
          clientY: startY,
        })
      );
      toast.dispatchEvent(
        new PointerEvent("pointermove", {
          ...base,
          pointerId,
          buttons: 1,
          clientX: startX + moveX,
          clientY: startY + moveY,
        })
      );
      toast.dispatchEvent(
        new PointerEvent("pointerup", {
          ...base,
          pointerId,
          button: 0,
          clientX: startX + moveX,
          clientY: startY + moveY,
        })
      );
    },
    { toastId: id, moveX: deltaX, moveY: deltaY }
  );
}

test.describe("Toast lifecycle", () => {
  test("reduced-motion toast appears and auto-dismisses without getting stuck", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Reduced motion toast", {
        id: "reduced-motion-toast",
        kind: "info",
        duration: 180,
      });
    });

    await expect(page.locator("#reduced-motion-toast")).toBeVisible();

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
        { timeout: 4000 }
      )
      .toBe(0);

    await expect(page.locator("#reduced-motion-toast")).toHaveCount(0);
    await context.close();
  });

  test("burst toasts keep at most 3 visible, expose stack variables, and drain queue", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      for (let index = 0; index < 7; index += 1) {
        (window as any).createToast?.(`Burst toast ${index + 1}`, {
          id: `burst-toast-${index + 1}`,
          kind: index % 3 === 0 ? "success" : "info",
          duration: 450,
        });
      }
    });

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
        { timeout: 2500 }
      )
      .toBe(3);

    const stackShifts = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>(".dynamic-toast.show")).map((node) => {
        const inline = node.style.getPropertyValue("--toast-stack-shift").trim();
        const computed = getComputedStyle(node).getPropertyValue("--toast-stack-shift").trim();
        return inline || computed;
      })
    );
    expect(new Set(stackShifts).size).toBeGreaterThan(1);

    const stackDepths = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>(".dynamic-toast.show"))
        .map((node) => {
          const inline = node.style.getPropertyValue("--toast-depth").trim();
          const computed = getComputedStyle(node).getPropertyValue("--toast-depth").trim();
          const value = Number.parseFloat(inline || computed);
          return Number.isFinite(value) ? value : null;
        })
        .filter((value): value is number => value !== null)
    );
    expect(stackDepths.length).toBeGreaterThanOrEqual(2);
    expect(new Set(stackDepths.map((value) => value.toFixed(2))).size).toBeGreaterThan(1);
    expect(Math.max(...stackDepths)).toBeLessThanOrEqual(1);

    await expect
      .poll(
        async () =>
          page.evaluate(() =>
            Array.from(document.querySelectorAll<HTMLElement>(".dynamic-toast.show")).some(
              (node) => /^burst-toast-[4-7]$/.test(node.id)
            )
          ),
        { timeout: 5000 }
      )
      .toBeTruthy();

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast").length),
        { timeout: 6000 }
      )
      .toBe(0);
  });

  test("dedupe by id updates existing toast and keeps a single node", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("First payload", {
        id: "dedupe-toast",
        kind: "info",
        duration: 3000,
      });
      (window as any).createToast?.("Second payload", {
        id: "dedupe-toast",
        kind: "success",
        duration: 3000,
      });
    });

    await expect(page.locator("#dedupe-toast")).toHaveCount(1);
    await expect(page.locator("#dedupe-toast")).toContainText("Second payload");
    await expect(page.locator("#dedupe-toast")).toHaveClass(/toast-kind-success/);
  });

  test("valid mobile swipe dismisses toast", async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Swipe dismiss", {
        id: "swipe-dismiss-toast",
        kind: "info",
        duration: 6000,
      });
    });

    await expect(page.locator("#swipe-dismiss-toast")).toBeVisible();
    await swipeToast(page, "swipe-dismiss-toast", 124, 8);

    await expect
      .poll(
        async () => page.evaluate(() => document.querySelectorAll("#swipe-dismiss-toast").length),
        { timeout: 4000 }
      )
      .toBe(0);

    await context.close();
  });

  test("small or off-axis mobile swipe rebounds and keeps toast visible", async ({ browser }) => {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Swipe rebound", {
        id: "swipe-rebound-toast",
        kind: "info",
        duration: 1400,
      });
    });

    await expect(page.locator("#swipe-rebound-toast")).toBeVisible();
    await swipeToast(page, "swipe-rebound-toast", 24, 5);

    await expect(page.locator("#swipe-rebound-toast")).toBeVisible();
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const toast = document.getElementById("swipe-rebound-toast");
            if (!(toast instanceof HTMLElement)) {
              return "";
            }
            return getComputedStyle(toast).getPropertyValue("--toast-swipe-x").trim();
          }),
        { timeout: 3000 }
      )
      .toMatch(/^0(px)?$/);

    await context.close();
  });

  test("reduced-motion queue drains without stuck visible toasts", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      for (let index = 0; index < 5; index += 1) {
        (window as any).createToast?.(`RM toast ${index + 1}`, {
          id: `rm-toast-${index + 1}`,
          kind: "info",
          duration: 160,
        });
      }
    });

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast.show").length),
        { timeout: 2500 }
      )
      .toBeLessThanOrEqual(3);

    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll(".dynamic-toast").length),
        { timeout: 6000 }
      )
      .toBe(0);

    await context.close();
  });

  test("theme toast uses non-conflicting id and keeps DOM ids unique", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await expect(page.locator("#theme-toast")).toHaveCount(0);

    await page.evaluate(() => {
      const toggle = document.getElementById("theme-toggle");
      if (!(toggle instanceof HTMLInputElement)) {
        return;
      }
      for (let i = 0; i < 2; i += 1) {
        toggle.checked = !toggle.checked;
        toggle.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    await expect(page.locator("#theme-change-toast")).toHaveCount(1);

    const duplicateIds = await page.evaluate(() => {
      const counts = new Map<string, number>();
      document.querySelectorAll<HTMLElement>("[id]").forEach((node) => {
        const key = node.id;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      return Array.from(counts.entries()).filter(([, count]) => count > 1);
    });
    expect(duplicateIds).toHaveLength(0);
  });

  test("toast pauses on hover and resumes lifecycle on leave", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Pause and resume", {
        id: "pause-resume-toast",
        kind: "info",
        duration: 420,
      });
    });

    const toast = page.locator("#pause-resume-toast");
    await expect(toast).toBeVisible();
    await page.waitForTimeout(130);
    await toast.dispatchEvent("pointerenter");
    await page.waitForTimeout(500);
    await expect(toast).toBeVisible();

    await toast.dispatchEvent("pointerleave");
    await expect
      .poll(
        async () =>
          page.evaluate(() => document.querySelectorAll("#pause-resume-toast").length),
        { timeout: 2500 }
      )
      .toBe(0);
  });

  test("Escape dismisses the most recent visible toast", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("First escape target", {
        id: "escape-toast-1",
        kind: "info",
        duration: 6000,
      });
      window.setTimeout(() => {
        (window as any).createToast?.("Second escape target", {
          id: "escape-toast-2",
          kind: "success",
          duration: 6000,
        });
      }, 45);
    });

    await page.evaluate(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && typeof active.blur === "function") {
        active.blur();
      }
    });
    await page.locator("body").click({ position: { x: 8, y: 8 } });

    await expect(page.locator("#escape-toast-2")).toBeVisible();
    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
    });

    await expect(page.locator("#escape-toast-2")).toHaveCount(0);
    await expect(page.locator("#escape-toast-1")).toBeVisible();

    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
    });
    await expect(page.locator("#escape-toast-1")).toHaveCount(0);
  });

  test("toast supports danger icon token mapping", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Danger icon token", {
        id: "danger-token-toast",
        kind: "error",
        iconClass: "fas fa-exclamation-triangle",
        iconColor: "var(--toast-danger)",
        duration: 2400,
      });
    });

    await expect(page.locator("#danger-token-toast")).toBeVisible();

    const colors = await page.evaluate(() => {
      const icon = document.querySelector<HTMLElement>("#danger-token-toast .toast-icon");
      if (!icon) {
        return { actual: "", expected: "" };
      }

      const probe = document.createElement("span");
      probe.style.color = "var(--toast-danger)";
      document.body.appendChild(probe);
      const expected = getComputedStyle(probe).color;
      probe.remove();

      return {
        actual: getComputedStyle(icon).color,
        expected,
      };
    });

    expect(colors.actual).toBe(colors.expected);
  });

  test("toast rail uses dual-layer accent and intensifies on hover", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Rail check", {
        id: "rail-layer-toast",
        kind: "success",
        duration: 2800,
      });
    });

    const toast = page.locator("#rail-layer-toast");
    await expect(toast).toBeVisible();

    const initial = await page.evaluate(() => {
      const node = document.getElementById("rail-layer-toast");
      if (!(node instanceof HTMLElement)) {
        return { layers: 0, opacity: 0, shadow: "none" };
      }
      const before = getComputedStyle(node, "::before");
      return {
        layers: (before.backgroundImage.match(/linear-gradient/gi) || []).length,
        opacity: Number.parseFloat(before.opacity) || 0,
        shadow: before.boxShadow,
      };
    });

    await toast.hover();
    await page.waitForTimeout(150);

    const hovered = await page.evaluate(() => {
      const node = document.getElementById("rail-layer-toast");
      if (!(node instanceof HTMLElement)) {
        return { opacity: 0, shadow: "none" };
      }
      const before = getComputedStyle(node, "::before");
      return {
        opacity: Number.parseFloat(before.opacity) || 0,
        shadow: before.boxShadow,
      };
    });

    expect(initial.layers).toBeGreaterThanOrEqual(2);
    expect(hovered.opacity).toBeGreaterThanOrEqual(initial.opacity);
    expect(hovered.shadow).not.toBe("none");
  });

  test("toast icon badge renders from tokenized surface without affecting close icon", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    await page.evaluate(() => {
      (window as any).createToast?.("Badge check", {
        id: "icon-badge-toast",
        kind: "info",
        closeButton: true,
        duration: 2800,
      });
    });

    await expect(page.locator("#icon-badge-toast")).toBeVisible();

    const styles = await page.evaluate(() => {
      const icon = document.querySelector<HTMLElement>("#icon-badge-toast .toast-icon");
      const closeIcon = document.querySelector<HTMLElement>("#icon-badge-toast .toast-close i");
      if (!icon || !closeIcon) {
        return {
          iconBackground: "",
          expectedBackground: "",
          iconBorderColor: "",
          expectedBorderColor: "",
          iconBorderWidth: "",
          closeMarginLeft: "",
          closeMarginRight: "",
        };
      }

      const iconVars = getComputedStyle(icon);
      const badgeBgToken = iconVars.getPropertyValue("--toast-icon-badge-bg").trim();
      const badgeBorderToken = iconVars
        .getPropertyValue("--toast-icon-badge-border")
        .trim();
      const bgProbe = document.createElement("span");
      bgProbe.style.backgroundColor = badgeBgToken;
      bgProbe.style.borderColor = badgeBorderToken;
      document.body.appendChild(bgProbe);
      const expected = getComputedStyle(bgProbe);
      const expectedBackground = expected.backgroundColor;
      const expectedBorderColor = expected.borderTopColor;
      bgProbe.remove();

      const iconStyle = getComputedStyle(icon);
      const closeStyle = getComputedStyle(closeIcon);
      return {
        iconBackground: iconStyle.backgroundColor,
        expectedBackground,
        iconBorderColor: iconStyle.borderTopColor,
        expectedBorderColor,
        iconBorderWidth: iconStyle.borderTopWidth,
        closeMarginLeft: closeStyle.marginLeft,
        closeMarginRight: closeStyle.marginRight,
      };
    });

    expect(styles.iconBackground).toBe(styles.expectedBackground);
    expect(styles.iconBorderColor).toBe(styles.expectedBorderColor);
    expect(styles.iconBorderWidth).not.toBe("0px");
    expect(styles.closeMarginLeft).toBe("0px");
    expect(styles.closeMarginRight).toBe("0px");
  });

  test("dark-mode toast adapts contrast when prefers-contrast is more", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await clearToasts(page);

    const supportsContrast = await page.evaluate(
      () => window.matchMedia("(prefers-contrast: more)").media !== "not all"
    );
    test.skip(!supportsContrast, "Browser does not expose prefers-contrast media query.");

    await page.emulateMedia({
      colorScheme: "dark",
      contrast: "no-preference",
    } as any);
    await page.evaluate(() => {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
      (window as any).createToast?.("Dark contrast baseline", {
        id: "contrast-baseline-toast",
        kind: "info",
        closeButton: true,
        duration: 3200,
      });
    });
    await expect(page.locator("#contrast-baseline-toast")).toBeVisible();
    await page.evaluate(() => {
      const close = document.querySelector<HTMLElement>(
        "#contrast-baseline-toast .toast-close"
      );
      close?.focus();
    });

    const baseline = await page.evaluate(() => {
      const toast = document.getElementById("contrast-baseline-toast");
      const close = document.querySelector<HTMLElement>("#contrast-baseline-toast .toast-close");
      if (!(toast instanceof HTMLElement) || !(close instanceof HTMLElement)) {
        return { borderColor: "", outlineWidth: "" };
      }
      const toastStyle = getComputedStyle(toast);
      const closeStyle = getComputedStyle(close);
      return {
        borderColor: toastStyle.borderTopColor,
        outlineWidth: closeStyle.outlineWidth,
      };
    });

    await clearToasts(page);
    await page.emulateMedia({ colorScheme: "dark", contrast: "more" } as any);
    const prefersMore = await page.evaluate(() =>
      window.matchMedia("(prefers-contrast: more)").matches
    );
    test.skip(!prefersMore, "Contrast emulation is not available on this browser.");

    await page.evaluate(() => {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
      (window as any).createToast?.("Dark contrast more", {
        id: "contrast-more-toast",
        kind: "info",
        closeButton: true,
        duration: 3200,
      });
    });
    await expect(page.locator("#contrast-more-toast")).toBeVisible();
    await page.evaluate(() => {
      const close = document.querySelector<HTMLElement>("#contrast-more-toast .toast-close");
      close?.focus();
    });

    const stronger = await page.evaluate(() => {
      const toast = document.getElementById("contrast-more-toast");
      const close = document.querySelector<HTMLElement>("#contrast-more-toast .toast-close");
      if (!(toast instanceof HTMLElement) || !(close instanceof HTMLElement)) {
        return { borderColor: "", outlineWidth: "" };
      }
      const toastStyle = getComputedStyle(toast);
      const closeStyle = getComputedStyle(close);
      return {
        borderColor: toastStyle.borderTopColor,
        outlineWidth: closeStyle.outlineWidth,
      };
    });

    expect(stronger.borderColor).not.toBe(baseline.borderColor);
    expect(Number.parseFloat(stronger.outlineWidth)).toBeGreaterThanOrEqual(
      Number.parseFloat(baseline.outlineWidth)
    );
  });

  for (const pagePath of [HOME_PATH, EN_HOME_PATH] as const) {
    test(`close icon keeps zero side margins on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath, { waitUntil: "domcontentloaded" });
      await clearToasts(page);

      await page.evaluate(() => {
        (window as any).createToast?.("Close icon alignment", {
          id: "close-icon-align-toast",
          kind: "info",
          closeButton: true,
          duration: 2800,
        });
      });

      await expect(page.locator("#close-icon-align-toast")).toBeVisible();

      const margins = await page.evaluate(() => {
        const icon = document.querySelector<HTMLElement>(
          "#close-icon-align-toast .toast-close i"
        );
        if (!icon) {
          return { left: "", right: "" };
        }
        const style = getComputedStyle(icon);
        return {
          left: style.marginLeft,
          right: style.marginRight,
        };
      });

      expect(margins.left).toBe("0px");
      expect(margins.right).toBe("0px");
    });
  }

  test("faq local fallback toast works without re-defining global API", async ({ page }) => {
    await page.addInitScript(() => {
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

    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      // Simulate missing global toast engine after page boot.
      try {
        (window as any).createToast = undefined;
      } catch {}
    });

    const copyFaqLink = page.locator(".copy-faq-link").first();
    await expect(copyFaqLink).toBeVisible();
    await copyFaqLink.click();

    await expect(page.locator(".toast-notification")).toBeVisible();
    await expect
      .poll(async () => page.evaluate(() => typeof (window as any).createToast))
      .toBe("undefined");
  });
});
