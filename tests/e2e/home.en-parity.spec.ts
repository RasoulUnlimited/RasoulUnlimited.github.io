import { expect, test } from "@playwright/test";

const HOME_PATH = "/en/index.html";

test.describe("EN Home Parity", () => {
  test("hero exposes parity structure and runtime motion flags", async ({ page }) => {
    await page.goto(HOME_PATH, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(700);

    await expect(page.locator("#hero")).toHaveAttribute("data-hero-motion", /full|lite|off/);
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
});
