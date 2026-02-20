import { expect, test, type Page } from "@playwright/test";

const HOME_PATH = "/en/index.html";

type AosNodeState = {
  hidden: boolean;
  hasAosAnimate: boolean;
  hasAosInit: boolean;
  opacity: number;
};

type SectionAosState = {
  firstAos: AosNodeState | null;
  hash: string;
  target: AosNodeState;
};

async function getSectionAosState(
  page: Page,
  selector: string
): Promise<SectionAosState | null> {
  return page.evaluate((targetSelector) => {
    const target = document.querySelector(targetSelector);
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    const toNodeState = (node: HTMLElement): AosNodeState => {
      const style = getComputedStyle(node);
      const opacity = Number.parseFloat(style.opacity || "0");
      return {
        opacity: Number.isNaN(opacity) ? 0 : opacity,
        hidden: style.visibility === "hidden" || style.display === "none",
        hasAosInit: node.classList.contains("aos-init"),
        hasAosAnimate: node.classList.contains("aos-animate"),
      };
    };

    const firstAosNode = target.matches("[data-aos]")
      ? target
      : target.querySelector("[data-aos]");

    return {
      hash: window.location.hash || "",
      target: toNodeState(target),
      firstAos: firstAosNode instanceof HTMLElement ? toNodeState(firstAosNode) : null,
    };
  }, selector);
}

async function expectSectionVisibleWithoutAosStuck(
  page: Page,
  selector: string,
  expectedHash?: string
) {
  await expect
    .poll(
      async () => {
        const state = await getSectionAosState(page, selector);
        if (!state) {
          return false;
        }

        const isVisible = (node: AosNodeState) => node.opacity > 0.01 && !node.hidden;
        const isNotStuck = (node: AosNodeState) =>
          !node.hasAosInit || node.hasAosAnimate || isVisible(node);

        const targetOk = isVisible(state.target) && isNotStuck(state.target);
        const firstAosOk = !state.firstAos || (isVisible(state.firstAos) && isNotStuck(state.firstAos));
        const hashOk = !expectedHash || state.hash === expectedHash;
        return targetOk && firstAosOk && hashOk;
      },
      { timeout: 5000 }
    )
    .toBeTruthy();
}

test.describe("EN Home Parity", () => {
  test("hero exposes parity structure and runtime motion flags", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);

    await expect(page.locator("#hero")).toHaveAttribute("data-hero-motion", /full|lite|off/);
    await expect(page.locator("#scroll-progress-bar")).toHaveCount(1);
    await expect(page.locator("#hero #hero-particles")).toBeVisible();
    await expect(page.locator("#hero .scroll-indicator-link")).toHaveAttribute("href", "#about");
    await expect(page.locator("#hero .social-links-hero .hero-social-link")).toHaveCount(4);
  });

  test("about block keeps enhanced actions and cards", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.locator("#about").scrollIntoViewIfNeeded();

    await expect(page.locator("#about.about-enhanced")).toBeVisible();
    await expect(page.locator("#about .about-actions .about-btn")).toHaveCount(2);
    await expect(page.locator("#about .about-cards .info-card h3")).toHaveCount(3);
  });

  test("skills block keeps parity controls and data contract", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.locator("#skills").scrollIntoViewIfNeeded();

    await expect(page.locator("#skills .skills-toolbar")).toBeVisible();
    await expect(page.locator("#skills .skills-filter")).toHaveCount(7);
    await expect(page.locator("#skills #skills-expand-toggle")).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    await expect(page.locator("#skills .skills-list .skill-chip")).toHaveCount(30);
    await expect(page.locator("#skills .skills-list .skill-chip .tier-badge")).toHaveCount(
      30
    );
  });

  test("timeline supports deep-link targeting and event ids", async ({ page }) => {
    await page.goto(`${HOME_PATH}#timeline-event-current-focus`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(500);

    const ids = [
      "timeline-event-birth",
      "timeline-event-karate",
      "timeline-event-discord-bot",
      "timeline-event-university",
      "timeline-event-c-projects",
      "timeline-event-python-projects",
      "timeline-event-writing-series",
      "timeline-event-current-focus",
      "timeline-event-future",
    ];

    for (const id of ids) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }

    await expect(page.locator("#timeline-event-current-focus")).toHaveClass(/is-targeted/);
  });

  test("anchor reveal timing matches FA behavior across key sections", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });

    const sections = ["about", "projects", "faq", "testimonials", "connect"];
    for (const sectionId of sections) {
      const hash = `#${sectionId}`;
      await page.locator(`.nav-links a[href="${hash}"]`).first().click();
      await expectSectionVisibleWithoutAosStuck(page, hash, hash);
    }
  });

  test("direct hash load reveals faq section and first AOS wrapper", async ({ page }) => {
    await page.goto(`${HOME_PATH}#faq`, { waitUntil: "networkidle" });
    await expectSectionVisibleWithoutAosStuck(page, "#faq", "#faq");
  });

  test("faq contains six items with copy-link and feedback persistence", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "networkidle" });
    await page.locator("#faq").scrollIntoViewIfNeeded();

    await expect(page.locator("#faq-container .faq-item")).toHaveCount(6);
    await expect(page.locator("#faq-item-en-6 .copy-faq-link")).toBeVisible();

    const firstHeader = page.locator("#faq-item-en-1 .accordion-header");
    await firstHeader.click();
    await expect(firstHeader).toHaveAttribute("aria-expanded", "true");

    const upVote = page.locator("#faq-item-en-1 .btn-feedback.up");
    await upVote.click({ force: true });

    const stored = await page.evaluate(() =>
      localStorage.getItem("faq-feedback-faq-item-en-1")
    );
    expect(stored).toBe("up");
  });

  test("testimonials intro and giscus contract stay aligned for english page", async ({
    page,
  }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.locator("#testimonials").scrollIntoViewIfNeeded();

    await expect(page.locator("#testimonials .feedback-subtitle")).toBeVisible();

    const attrs = await page.evaluate(() => {
      const root = document.querySelector("#testimonials [data-giscus-root]");
      return {
        term: root?.getAttribute("data-giscus-term") || "",
        lang: root?.getAttribute("data-giscus-lang") || "",
      };
    });

    expect(attrs.term).toBe("en/");
    expect(attrs.lang).toBe("en");
  });

  test("scrolling reveals floating action buttons and updates progress", async ({ page }) => {
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
});
