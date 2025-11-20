# Testing Guide

This document outlines the testing and quality assurance processes for the Rasoul Unlimited website.

## Automated Testing

### Code Quality Checks

Run linting checks to catch syntax and style issues:

```bash
# Run all linting checks
npm run lint

# Run specific linters
npx eslint "**/*.js" --ignore-pattern="**/node_modules/**" --ignore-pattern="**/*.min.js"
npx htmlhint "**/*.html"

# Automatically fix fixable issues
npm run lint:fix
```

### Security Audit

Check for vulnerabilities in dependencies:

```bash
# Audit production dependencies
npm run audit:prod

# Interactive audit with fix recommendations
npm run audit
```

## Manual Testing

### Browser Compatibility

Test on the following browsers:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Performance Testing

1. **Lighthouse Audit** (Chrome DevTools)
   - Open DevTools → Lighthouse
   - Run audit for Performance, Accessibility, SEO
   - Target: 90+ score

2. **Core Web Vitals**
   - Largest Contentful Paint (LCP): < 2.5s
   - First Input Delay (FID): < 100ms
   - Cumulative Layout Shift (CLS): < 0.1

3. **Page Load Time**
   - Full page load: < 3 seconds
   - Time to Interactive: < 5 seconds

### Accessibility Testing

- Use WAVE browser extension for accessibility issues
- Test keyboard navigation (Tab, Enter, Escape)
- Verify screen reader compatibility (NVDA, JAWS)
- Check color contrast ratios (WCAG AA minimum)

### Mobile Testing

- Test responsive design at breakpoints: 320px, 768px, 1024px
- Test touch interactions (tap, swipe)
- Verify Service Worker works offline
- Test on slow 3G connection

### Service Worker Testing

```javascript
// In browser console:
// Check registration
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log('SW registered:', reg));
});

// Manually trigger update check
navigator.serviceWorker.getRegistration().then(reg => {
  reg?.update();
});

// Check cache storage
caches.keys().then(cacheNames => {
  console.log('Caches:', cacheNames);
});
```

### Offline Testing

1. Open DevTools → Network tab
2. Enable "Offline" checkbox
3. Refresh page
4. Verify fallback page displays correctly

## Testing Checklist

Before deploying to production:

- [ ] All ESLint checks pass
- [ ] All HTMLHint checks pass
- [ ] No console errors in production build
- [ ] No security vulnerabilities detected
- [ ] Lighthouse score ≥ 90
- [ ] Core Web Vitals within targets
- [ ] Responsive design works at all breakpoints
- [ ] Service Worker registers successfully
- [ ] Offline fallback works
- [ ] All links working (no 404s)
- [ ] External resources load correctly
- [ ] Forms work and submit successfully
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

## Continuous Integration

Tests are automatically run on:
- Every commit to PRs
- Linting checks (ESLint, HTMLHint)
- Security audit

## Debugging Tips

### Enable Debug Mode

Add `?debug=1` to URL for verbose logging:

```javascript
if (new URLSearchParams(location.search).get('debug')) {
  console.log = console.log; // Prevent log stripping
}
```

### Service Worker Debugging

In DevTools Application tab:
- Service Workers panel: See registration and updates
- Cache Storage: Inspect cached resources
- Manifest: Verify web app manifest

### Performance Profiling

Use Chrome DevTools Performance tab:
1. Open DevTools → Performance
2. Click Record
3. Perform actions
4. Click Stop
5. Analyze the timeline

## Reporting Issues

When you find an issue:

1. **Reproduce reliably**: Document exact steps
2. **Check existing issues**: Avoid duplicates
3. **Provide details**:
   - Browser and version
   - Device/OS
   - Expected vs actual behavior
   - Screenshots/console errors
4. **Open issue** on GitHub

## Resources

- [ESLint Documentation](https://eslint.org)
- [HTMLHint Documentation](https://htmlhint.io)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
