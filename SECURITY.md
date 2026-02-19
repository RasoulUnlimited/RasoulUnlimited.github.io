# Security Policy / سیاست امنیتی

## Purpose / هدف
### فارسی
امنیت این وب سایت و زیرساخت آن برای ما جدی است. اگر آسیب پذیری امنیتی پیدا کردید، لطفا مسئولانه گزارش دهید تا بدون به خطر افتادن کاربران، بررسی و رفع انجام شود.

### English
We take the security of this website and its infrastructure seriously. If you discover a security vulnerability, please report it responsibly so we can investigate and resolve it without putting users at risk.

## Contact / راه ارتباطی
### فارسی
- ایمیل اصلی: `rasoul.unlimited@gmail.com`
- قالب عنوان ایمیل: `Security Report - <short description>`
- کانال اصلی گزارش امنیتی ایمیل است.

### English
- Primary email: `rasoul.unlimited@gmail.com`
- Suggested subject line: `Security Report - <short description>`
- Email is the primary reporting channel.

## How to Report / نحوه گزارش
### فارسی
برای تسریع بررسی، موارد زیر را ارسال کنید:
1. خلاصه مشکل و اثر امنیتی احتمالی
2. مراحل دقیق بازتولید (URL، پارامتر، HTTP method)
3. PoC کوتاه و غیرمخرب (در صورت وجود)
4. جزئیات محیط (مرورگر، سیستم عامل، نسخه)
5. شواهد (log، screenshot، request/response)
6. راه تماس شما برای پیگیری

لطفا تا زمان بررسی و رفع، جزئیات فنی را عمومی منتشر نکنید.

### English
To help us triage quickly, include:
1. A clear summary and expected security impact
2. Exact reproduction steps (URL, parameters, HTTP method)
3. A short non-destructive PoC (if available)
4. Environment details (browser, OS, version)
5. Evidence (logs, screenshots, request/response samples)
6. Your contact details for follow-up

Please do not publicly disclose technical details before investigation and remediation.

## Sensitive Reports (PGP) / گزارش های حساس (PGP)
### فارسی
اگر گزارش شما شامل اطلاعات حساس است (مانند توکن فعال یا PoC حساس)، پیام را رمزنگاری کنید:
- کلید عمومی PGP: [`assets/keys/rasoulunlimited_pgp.asc`](assets/keys/rasoulunlimited_pgp.asc)
- Keybase: <https://keybase.io/rasoulunlimited>
- Fingerprint:
`D483 4991 882E 7EC4 4187 40AC 1CAF 52B8 DB95 F6FE`

پس از رمزنگاری، گزارش را به `rasoul.unlimited@gmail.com` ارسال کنید.

### English
If your report contains sensitive information (for example active tokens or sensitive PoC details), use encryption:
- PGP public key: [`assets/keys/rasoulunlimited_pgp.asc`](assets/keys/rasoulunlimited_pgp.asc)
- Keybase: <https://keybase.io/rasoulunlimited>
- Fingerprint:
`D483 4991 882E 7EC4 4187 40AC 1CAF 52B8 DB95 F6FE`

After encryption, send the report to `rasoul.unlimited@gmail.com`.

## Coordinated Disclosure / افشای هماهنگ
### فارسی
- لطفا قبل از تایید دریافت گزارش و انتشار اصلاح، جزئیات فنی را عمومی نکنید.
- بدون مجوز به داده ای که متعلق به شما نیست دسترسی نگیرید، آن را تغییر ندهید و حذف نکنید.
- تست هایی که باعث اختلال سرویس یا آسیب به کاربران شوند انجام ندهید.

### English
- Please avoid public disclosure before we acknowledge the report and deploy a fix, or agree on a disclosure timeline.
- Do not intentionally access, modify, or delete data that is not yours.
- Do not perform testing that can degrade service or harm other users.

## In Scope / محدوده مجاز
### فارسی
این سیاست برای موارد زیر است:
- `https://rasoulunlimited.ir`
- `https://www.rasoulunlimited.ir`
- assetها و endpointهای عمومی تحت همین دامنه ها

سرویس های ثالث (مانند CDN، hosting، analytics یا form provider) تحت سیاست خود آن سرویس ها هستند.

### English
This policy covers:
- `https://rasoulunlimited.ir`
- `https://www.rasoulunlimited.ir`
- Public assets and endpoints under these domains

Third-party providers (for example CDN, hosting, analytics, or form providers) follow their own security policies.

## Out of Scope / خارج از محدوده
### فارسی
موارد زیر معمولا آسیب پذیری قابل قبول این برنامه محسوب نمی شوند:
- self-XSS که مهاجم و قربانی یک نفر هستند
- کتابخانه قدیمی بدون exploit عملی و قابل اثبات
- clickjacking روی صفحات غیرحساس
- مشکلاتی که فقط روی مرورگرهای بسیار قدیمی/پشتیبانی نشده رخ می دهند
- پیشنهادهای hardening بدون اثر امنیتی روشن

### English
The following are generally out of scope:
- Self-XSS where the attacker is also the victim
- Outdated libraries without a practical, demonstrable exploit
- Clickjacking on non-sensitive pages
- Issues affecting only very old or unsupported browsers
- Hardening or best-practice suggestions without clear security impact

## Rules of Engagement / قواعد تست
### فارسی
- فقط تست غیرمخرب انجام دهید.
- از DoS/DDoS، fuzzing سنگین، اسکن تهاجمی و تولید ترافیک بیش از حد خودداری کنید.
- تا حد امکان از داده تست استفاده کنید و به داده واقعی کاربران دسترسی نگیرید.
- اگر به داده واقعی یا وضعیت پرخطر برخورد کردید، تست را متوقف کنید و فوری اطلاع دهید.
- رعایت قوانین محلی و بین المللی مرتبط بر عهده پژوهشگر است.

### English
- Perform non-destructive testing only.
- Avoid DoS/DDoS, heavy fuzzing, aggressive scanning, and excessive traffic generation.
- Use test data where possible and avoid accessing real user data.
- If you encounter real production data or a risky situation, stop testing and report immediately.
- You are responsible for complying with applicable laws and regulations.

## Response Targets / زمان بندی پاسخ
### فارسی
زمان بندی زیر **non-binding goals** است و تضمین قطعی نیست:
- Acknowledge: تا 48 ساعت
- Initial assessment: تا 7 روز
- Fix/Mitigation plan: تا 30 روز (بسته به شدت و پیچیدگی)

### English
These response targets are **non-binding goals**, not guarantees:
- Acknowledge: within 48 hours
- Initial assessment: within 7 days
- Fix/Mitigation plan: within 30 days (depending on severity and complexity)

## Recognition / قدردانی
### فارسی
در صورت تمایل شما، بعد از رفع مشکل می توانیم نام یا handle شما را در بخش قدردانی امنیتی منتشر کنیم. این برنامه شامل تعهد bounty نقدی نیست.

### English
If you wish, we may publicly credit your name or handle after the issue is resolved. This policy does not promise a monetary bounty program.

## Canonical References / ارجاعات مرجع
### فارسی
- نسخه canonical و machine-readable:
`/.well-known/security.txt` -> <https://rasoulunlimited.ir/.well-known/security.txt>
- نسخه انسانی سیاست:
<https://rasoulunlimited.ir/security.html>
<https://rasoulunlimited.ir/en/security.html>

### English
- Canonical machine-readable policy:
`/.well-known/security.txt` -> <https://rasoulunlimited.ir/.well-known/security.txt>
- Human-readable policy pages:
<https://rasoulunlimited.ir/security.html>
<https://rasoulunlimited.ir/en/security.html>
