document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");

  if (!loader) return;

  // FUNCIÓN GLOBAL (LA CLAVE)
  window.navegar = function (url) {
    loader.classList.add("active");

    setTimeout(() => {
      window.location.href = url;
    }, 800);
  };

  // LINKS <a>
  document.querySelectorAll("a[href]").forEach((link) => {
    link.addEventListener("click", function (e) {
      const url = this.getAttribute("href");

      // ignorar si abre en otra pestaña
      if (this.target === "_blank") return;

      // ignorar si es anchor (#)
      if (!url || url.startsWith("#")) return;

      // ignorar si es mismo archivo
      if (url === window.location.pathname.split("/").pop()) return;

      e.preventDefault();

      navegar(url);
    });
  });

  // BOTONES con data-link
  document.querySelectorAll("[data-link]").forEach((el) => {
    el.addEventListener("click", function () {
      const url = this.getAttribute("data-link");
      navegar(url);
    });
  });
});
