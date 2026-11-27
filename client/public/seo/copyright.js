for (const element of document.querySelectorAll("[data-copyright-year]")) {
  element.textContent = String(new Date().getFullYear());
}
