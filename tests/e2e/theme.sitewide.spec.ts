import { expect, test, type Page } from "@playwright/test";

const KEY_PAGES = [
  "/index.html",
  "/about.html",
  "/contact.html",
  "/resume.html",
  "/press.html",
  "/quotes.html",
  "/security.html",
  "/faq/",
  "/projects/",
  "/projects/python-projects/",
  "/projects/c-projects/",
  "/ai/",
  "/press-kit/",
  "/en/index.html",
  "/en/about.html",
  "/en/contact.html",
  "/en/resume.html",
  "/en/press.html",
  "/en/quotes.html",
  "/en/security.html",
  "/en/faq/",
];

const SMOKE_PAGES = [
  "/concepts/visual-identity-loop/",
  "/concepts/social-gravity-effect/",
  "/concepts/authority-feedback-system/",
  "/wiki/rasoul-unlimited/",
];

type ThemeState = {
  appTheme: string | null;
  dataTheme: string;
  hasToggle: boolean;
  isDarkClass: boolean;
  isLightClass: boolean;
  storedTheme: string | null;
  toggleChecked: boolean;
};

async function waitForThemeToggle(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          return document.getElementById("theme-toggle") instanceof HTMLInputElement;
        }),
      { timeout: 12000 }
    )
    .toBeTruthy();
}

async function readThemeState(page: Page): Promise<ThemeState> {
  return page.evaluate(() => {
    const toggle = document.getElementById("theme-toggle");
    const input = toggle instanceof HTMLInputElement ? toggle : null;

    return {
      hasToggle: !!input,
      dataTheme: document.documentElement.getAttribute("data-theme") || "",
      isDarkClass: document.body.classList.contains("dark-mode"),
      isLightClass: document.body.classList.contains("light-mode"),
      toggleChecked: !!input?.checked,
      storedTheme: localStorage.getItem("theme"),
      appTheme: localStorage.getItem("app:theme"),
    };
  });
}

async function toggleTheme(page: Page) {
  await page.evaluate(() => {
    const toggle = document.getElementById("theme-toggle");
    if (toggle instanceof HTMLInputElement) {
      toggle.click();
    }
  });
}

function assertThemeClassSync(state: ThemeState) {
  expect(["dark", "light"]).toContain(state.dataTheme);

  if (state.dataTheme === "dark") {
    expect(state.isDarkClass).toBeTruthy();
    expect(state.isLightClass).toBeFalsy();
    expect(state.toggleChecked).toBeTruthy();
  } else {
    expect(state.isLightClass).toBeTruthy();
    expect(state.isDarkClass).toBeFalsy();
    expect(state.toggleChecked).toBeFalsy();
  }
}

test.describe("Sitewide Theme Toggle", () => {
  test("key pages: toggle changes theme, syncs classes, and persists after reload", async ({
    browser,
  }) => {
    test.setTimeout(10 * 60 * 1000);

    for (const path of KEY_PAGES) {
      const context = await browser.newContext({ colorScheme: "light" });
      const page = await context.newPage();

      await page.goto(path, { waitUntil: "domcontentloaded" });
      await waitForThemeToggle(page);

      const before = await readThemeState(page);
      expect(before.hasToggle).toBeTruthy();

      await toggleTheme(page);

      await expect
        .poll(async () => (await readThemeState(page)).dataTheme, { timeout: 6000 })
        .not.toBe(before.dataTheme);

      const after = await readThemeState(page);
      assertThemeClassSync(after);
      expect(after.storedTheme).toBe(after.dataTheme);
      expect(after.appTheme).toBeNull();

      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForThemeToggle(page);

      const afterReload = await readThemeState(page);
      assertThemeClassSync(afterReload);
      expect(afterReload.dataTheme).toBe(after.dataTheme);
      expect(afterReload.storedTheme).toBe(after.dataTheme);
      expect(afterReload.appTheme).toBeNull();

      await context.close();
    }
  });

  test("legacy app:theme migrates to theme and removes old key", async ({ browser }) => {
    for (const path of ["/about.html", "/en/about.html"]) {
      const context = await browser.newContext({ colorScheme: "light" });
      const page = await context.newPage();

      await page.addInitScript(() => {
        localStorage.removeItem("theme");
        localStorage.setItem("app:theme", "dark");
      });

      await page.goto(path, { waitUntil: "domcontentloaded" });
      await waitForThemeToggle(page);

      const state = await readThemeState(page);
      expect(state.dataTheme).toBe("dark");
      expect(state.storedTheme).toBe("dark");
      expect(state.appTheme).toBeNull();
      assertThemeClassSync(state);

      await context.close();
    }
  });

  test("manual light preference is not overridden by system dark fallback styles", async ({
    browser,
  }) => {
    for (const path of ["/index.html", "/en/index.html"]) {
      const context = await browser.newContext({ colorScheme: "dark" });
      const page = await context.newPage();

      await page.addInitScript(() => {
        localStorage.setItem("theme", "light");
        localStorage.removeItem("app:theme");
      });

      await page.goto(path, { waitUntil: "networkidle" });
      await waitForThemeToggle(page);

      const state = await readThemeState(page);
      expect(state.dataTheme).toBe("light");
      assertThemeClassSync(state);

      const visualState = await page.evaluate(() => {
        const connectCard = document.querySelector("#connect .social-link-card");
        const faqRoot = document.querySelector("#faq");
        const connectBg = connectCard
          ? getComputedStyle(connectCard).backgroundColor
          : "";
        const faqGradient = faqRoot
          ? getComputedStyle(faqRoot).getPropertyValue("--faq-bg-gradient").trim()
          : "";

        return { connectBg, faqGradient };
      });

      expect(visualState.connectBg).not.toBe("rgba(255, 255, 255, 0.02)");
      expect(visualState.faqGradient).toContain("135deg");

      await context.close();
    }
  });

  test("concept and wiki pages: theme toggle remains available (smoke)", async ({
    browser,
  }) => {
    test.setTimeout(3 * 60 * 1000);

    for (const path of SMOKE_PAGES) {
      const context = await browser.newContext({ colorScheme: "light" });
      const page = await context.newPage();

      await page.goto(path, { waitUntil: "domcontentloaded" });
      await waitForThemeToggle(page);

      const before = await readThemeState(page);
      await toggleTheme(page);

      await expect
        .poll(async () => (await readThemeState(page)).dataTheme, { timeout: 6000 })
        .not.toBe(before.dataTheme);

      const after = await readThemeState(page);
      expect(after.storedTheme).toBe(after.dataTheme);
      expect(after.appTheme).toBeNull();
      assertThemeClassSync(after);

      await context.close();
    }
  });
});
