async function includeHTML(callback) {
  const elements = document.querySelectorAll("[data-include-html]");
  const fetches = [];
  for (const el of elements) {
    const file = el.getAttribute("data-include-html");
    if (!file) continue;

    const fetchPromise = fetch(file)
      .then((resp) => resp.text())
      .then((html) => {
        el.innerHTML = html;
        if (file.includes("footer.html")) {
          const yearSpan = el.querySelector("#footer-year");
          if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
          }
        }
      })
      .catch((err) => console.error("Include error:", err));

    fetches.push(fetchPromise);
  }
  await Promise.all(fetches);
  if (typeof callback === "function") {
    callback();
  }
}

function setActiveNavLink() {
  const normalize = (path) =>
    path.replace(/\/index\.html$/, "/").replace(/\/$/, "/");
  const current = normalize(window.location.pathname);
  document.querySelectorAll(".navbar nav a").forEach((link) => {
    const linkPath = normalize(new URL(link.href).pathname);
    const isActive = linkPath === current;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
    if (link.parentElement && link.parentElement.tagName === "LI") {
      link.parentElement.classList.toggle("active", isActive);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  includeHTML(() => {
    setActiveNavLink();
    document.dispatchEvent(new Event("includesLoaded"));
  });
});
