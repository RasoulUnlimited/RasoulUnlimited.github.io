# Testing Guide / راهنمای تست

This guide is bilingual (FA/EN) and aligned with the current repository state.
این راهنما دوزبانه است و با وضعیت فعلی مخزن هماهنگ شده است.

## 1) Scope and Goal / هدف و دامنه

### فارسی
- این سند فقط فرآیند تست و کیفیت را پوشش می‌دهد.
- هیچ API یا type جدیدی تعریف نمی‌کند.
- تمام دستورات این فایل بر اساس `package.json` و `playwright.config.ts` فعلی هستند.

### English
- This document covers testing and quality workflow only.
- It does not introduce any new API or type.
- All commands are based on the current `package.json` and `playwright.config.ts`.

## 2) Prerequisites and Setup / پیش‌نیازها و راه‌اندازی

### فارسی
- Node.js: `>=18`
- npm: `>=9`
- نصب وابستگی‌ها:

```bash
npm install
```

- اجرای E2E طبق `playwright.config.ts`:
- حالت محلی: `npm run start` (روی پورت پیش‌فرض `8080`)
- حالت CI: `npm run build && npm run start`
- آدرس پیش‌فرض: `http://127.0.0.1:8080`

### English
- Node.js: `>=18`
- npm: `>=9`
- Install dependencies:

```bash
npm install
```

- E2E runtime behavior from `playwright.config.ts`:
- Local: `npm run start` (default port `8080`)
- CI: `npm run build && npm run start`
- Default URL: `http://127.0.0.1:8080`

## 3) Automated Quality Checks / بررسی خودکار کیفیت

### فارسی

```bash
# All lint checks
npm run lint

# Individual linters
npm run lint:html
npm run lint:js

# Auto-fix
npm run lint:fix
npm run lint:fix:js

# Strict mode (no warnings)
npm run test:strict

# SEO verification
npm run seo:verify
npm run seo:verify:strict

# Dependency audit
npm run audit:prod
npm run audit
```

- توجه: `npm run audit` شامل `npm audit fix` است و ممکن است `package-lock.json` را تغییر دهد.

### English

```bash
# All lint checks
npm run lint

# Individual linters
npm run lint:html
npm run lint:js

# Auto-fix
npm run lint:fix
npm run lint:fix:js

# Strict mode (no warnings)
npm run test:strict

# SEO verification
npm run seo:verify
npm run seo:verify:strict

# Dependency audit
npm run audit:prod
npm run audit
```

- Note: `npm run audit` includes `npm audit fix` and may modify `package-lock.json`.

## 4) Playwright E2E / تست انتهابه‌انتها با Playwright

### فارسی

```bash
# Main E2E suites
npm run test:e2e
npm run test:e2e:fast
npm run test:e2e:low
npm run test:e2e:headed
npm run test:e2e:debug
npm run test:e2e:report

# List discovered tests
npx playwright test --list

# Targeted runs
npx playwright test tests/e2e/home.hero.spec.ts
npx playwright test -g "timeline"
```

- متغیرهای محیطی پشتیبانی‌شده:
- `PW_PORT`
- `PW_BASE_URL`
- `PW_CHROMIUM_EXECUTABLE_PATH`
- `PW_WORKERS`
- `PW_FULLY_PARALLEL`
- `CI`

- ترتیب تشخیص executable مرورگر Chromium:
1. `PW_CHROMIUM_EXECUTABLE_PATH`
2. مسیر پیش‌فرض ویندوز: `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
3. مسیر پیش‌فرض داخلی Playwright

### English

```bash
# Main E2E suites
npm run test:e2e
npm run test:e2e:fast
npm run test:e2e:low
npm run test:e2e:headed
npm run test:e2e:debug
npm run test:e2e:report

# List discovered tests
npx playwright test --list

# Targeted runs
npx playwright test tests/e2e/home.hero.spec.ts
npx playwright test -g "timeline"
```

- Supported environment variables:
- `PW_PORT`
- `PW_BASE_URL`
- `PW_CHROMIUM_EXECUTABLE_PATH`
- `PW_WORKERS`
- `PW_FULLY_PARALLEL`
- `CI`

- Chromium executable resolution order:
1. `PW_CHROMIUM_EXECUTABLE_PATH`
2. Default Windows Chrome path: `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
3. Playwright built-in executable resolution

## 5) Coverage Map / نقشه پوشش تست

### فارسی
- Snapshot فعلی تست‌ها: `81 tests in 7 files` (بر اساس `npx playwright test --list`)

- `tests/e2e/home.a11y.spec.ts`
  تمرکز: دسترس‌پذیری و یکپارچگی DOM در صفحه خانه فارسی
- `tests/e2e/home.behavior.spec.ts`
  تمرکز: رفتار عمومی صفحه خانه فارسی، FAQ، theme، fallbackها
- `tests/e2e/home.connect.spec.ts`
  تمرکز: بخش ارتباط در FA/EN، clipboard، ابعاد touch-friendly
- `tests/e2e/home.en-parity.spec.ts`
  تمرکز: parity صفحه خانه انگلیسی با ویژگی‌های اصلی
- `tests/e2e/home.hero.spec.ts`
  تمرکز: Hero فارسی، motion mode، no-JS، contrast، schema
- `tests/e2e/home.testimonials.spec.ts`
  تمرکز: Testimonials و Giscus در FA/EN، retry/fallback/a11y
- `tests/e2e/timeline.resilience.spec.ts`
  تمرکز: Timeline فارسی، ترتیب زمانی، deep-link، مقاومت در AOS/no-JS/mobile

### English
- Current test snapshot: `81 tests in 7 files` (from `npx playwright test --list`)

- `tests/e2e/home.a11y.spec.ts`
  Focus: accessibility and DOM integrity on FA home
- `tests/e2e/home.behavior.spec.ts`
  Focus: FA home behavior, FAQ, theme flow, and fallbacks
- `tests/e2e/home.connect.spec.ts`
  Focus: FA/EN connect section, clipboard flow, touch-friendly controls
- `tests/e2e/home.en-parity.spec.ts`
  Focus: EN home parity for core UX blocks
- `tests/e2e/home.hero.spec.ts`
  Focus: FA hero layout, motion, no-JS, contrast, schema contracts
- `tests/e2e/home.testimonials.spec.ts`
  Focus: FA/EN testimonials and Giscus loading, retry, fallback, a11y
- `tests/e2e/timeline.resilience.spec.ts`
  Focus: FA timeline semantics, chronology, deep-link, AOS/no-JS/mobile resilience

## 6) Manual Smoke / تست دستی کوتاه

### فارسی
1. صفحه‌های اصلی را سریع بررسی کنید:
   - `/index.html`
   - `/en/index.html`
2. لینک‌ها، فرم‌ها و منابع خارجی بحرانی (CDN/Giscus) را sanity-check کنید.
3. یک اجرای سریع Lighthouse بگیرید و CWV را چک کنید:
   - LCP < 2.5s
   - INP < 200ms
   - CLS < 0.1
4. حداقل یک اجرای موبایل واقعی یا شبیه‌سازی‌شده برای overflow و touch انجام دهید.

### English
1. Do a quick sanity pass on:
   - `/index.html`
   - `/en/index.html`
2. Verify critical links, forms, and external dependencies (CDN/Giscus).
3. Run a quick Lighthouse check and verify CWV:
   - LCP < 2.5s
   - INP < 200ms
   - CLS < 0.1
4. Run at least one mobile pass (real device or emulation) for overflow and touch targets.

## 7) Service Worker and Offline / سرویس‌ورکر و آفلاین

### فارسی
- در صفحه‌های خانه (`/index.html` و `/en/index.html`) اسکریپت `sw-register` عمدا غیرفعال است.
- تست آفلاین را روی صفحاتی انجام دهید که واقعا Service Worker را register می‌کنند:
  - `/security.html`
  - `/en/security.html`

مراحل پیشنهادی:
1. صفحه security را باز کنید.
2. DevTools > Network > Offline
3. Refresh
4. رفتار fallback و cache را بررسی کنید.

Snippet مفید:

```javascript
navigator.serviceWorker.getRegistrations().then((regs) => {
  regs.forEach((reg) => console.log("SW registered:", reg.scope));
});

caches.keys().then((names) => console.log("Caches:", names));
```

### English
- On home pages (`/index.html`, `/en/index.html`), `sw-register` is intentionally disabled.
- Run offline checks on pages that actually register Service Worker:
  - `/security.html`
  - `/en/security.html`

Suggested flow:
1. Open a security page.
2. DevTools > Network > Offline
3. Refresh
4. Verify fallback and cache behavior.

Useful snippet:

```javascript
navigator.serviceWorker.getRegistrations().then((regs) => {
  regs.forEach((reg) => console.log("SW registered:", reg.scope));
});

caches.keys().then((names) => console.log("Caches:", names));
```

## 8) Troubleshooting / عیب‌یابی

### فارسی
- Chromium پیدا نمی‌شود:
  - متغیر `PW_CHROMIUM_EXECUTABLE_PATH` را تنظیم کنید.
  - مثال PowerShell:

```powershell
$env:PW_CHROMIUM_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run test:e2e
```

- پورت `8080` در دسترس نیست:
  - پورت دیگری بدهید:

```powershell
$env:PW_PORT="8090"
npm run test:e2e
```

- flaky network برای `giscus` یا CDN:
  - `npm run test:e2e:low` را اجرا کنید.
  - برای تحلیل، `npm run test:e2e:debug` یا `npm run test:e2e:report` را استفاده کنید.

### English
- Chromium executable not found:
  - Set `PW_CHROMIUM_EXECUTABLE_PATH`.
  - PowerShell example:

```powershell
$env:PW_CHROMIUM_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run test:e2e
```

- Port `8080` is busy:
  - Override the port:

```powershell
$env:PW_PORT="8090"
npm run test:e2e
```

- Flaky network for `giscus` or CDN:
  - Run `npm run test:e2e:low`.
  - Use `npm run test:e2e:debug` or `npm run test:e2e:report` for diagnosis.

## 9) CI Status / وضعیت CI

### فارسی
- در وضعیت فعلی مخزن، workflow ریشه‌ای CI (مثل GitHub Actions در `.github/workflows`) وجود ندارد.
- بنابراین این سند ادعای اجرای خودکار تست روی هر PR را نمی‌کند.
- وضعیت فعلی:
  - اجرای دستی/محلی دستورهای تست
  - گیت‌هوک اختیاری: `.githooks/pre-commit`

### English
- In the current repository state, no root CI workflow (for example `.github/workflows`) is present.
- Therefore, this guide does not claim automatic test execution on every PR.
- Current reality:
  - Local/manual execution of test commands
  - Optional local hook: `.githooks/pre-commit`

## 10) Pre-Release Checklist / چک‌لیست قبل از انتشار

### فارسی
- [ ] `npm run lint` بدون خطا اجرا می‌شود
- [ ] `npm run test:strict` پاس می‌شود
- [ ] `npm run test:e2e` پاس می‌شود
- [ ] در صورت نیاز گزارش: `npm run test:e2e:report`
- [ ] `npm run seo:verify` یا `npm run seo:verify:strict` اجرا شده است
- [ ] `npm run audit:prod` بررسی شده است
- [ ] Smoke دستی برای `/index.html` و `/en/index.html` انجام شده است
- [ ] CWV در بازه هدف (LCP/INP/CLS) است
- [ ] اگر تغییر آفلاین/کش داشتید، تست SW روی صفحات security انجام شده است

### English
- [ ] `npm run lint` passes
- [ ] `npm run test:strict` passes
- [ ] `npm run test:e2e` passes
- [ ] Report reviewed when needed: `npm run test:e2e:report`
- [ ] `npm run seo:verify` or `npm run seo:verify:strict` has been run
- [ ] `npm run audit:prod` has been reviewed
- [ ] Manual smoke pass completed for `/index.html` and `/en/index.html`
- [ ] CWV are within target ranges (LCP/INP/CLS)
- [ ] If offline/cache logic changed, SW checks were run on security pages

## 11) References / منابع

### فارسی
- [Playwright Docs](https://playwright.dev/docs/intro)
- [ESLint Docs](https://eslint.org/docs/latest/)
- [HTMLHint Docs](https://htmlhint.com/)
- [Lighthouse Docs](https://developer.chrome.com/docs/lighthouse/overview/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

### English
- [Playwright Docs](https://playwright.dev/docs/intro)
- [ESLint Docs](https://eslint.org/docs/latest/)
- [HTMLHint Docs](https://htmlhint.com/)
- [Lighthouse Docs](https://developer.chrome.com/docs/lighthouse/overview/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
