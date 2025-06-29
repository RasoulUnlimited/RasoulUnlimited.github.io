function activatePreloadedStyles() {
  document
    .querySelectorAll('link[rel="preload"][as="style"][data-make-stylesheet]')
    .forEach((preloadLink) => {
      const realHref = preloadLink.getAttribute("data-href");
      const newLink = document.createElement("link");
      newLink.rel = "stylesheet";
      newLink.href = realHref;
      newLink.crossOrigin = preloadLink.crossOrigin || "anonymous";
      newLink.referrerPolicy = preloadLink.referrerPolicy || "no-referrer";
      preloadLink.parentNode.insertBefore(newLink, preloadLink.nextSibling);
    });
}

if ("requestIdleCallback" in window) {
  window.requestIdleCallback(activatePreloadedStyles);
} else {
  window.addEventListener("load", activatePreloadedStyles);
}
