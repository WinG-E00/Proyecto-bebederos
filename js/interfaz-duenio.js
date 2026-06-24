document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggleDark");

  if (!toggleBtn) {
    console.log("No se encontró el botón");
    return;
  }

  // aplicar modo guardado
  if (localStorage.getItem("modo") === "dark") {
    document.body.classList.add("dark");
    toggleBtn.textContent = "☀️";
  }

  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      localStorage.setItem("modo", "dark");
      toggleBtn.textContent = "☀️";
    } else {
      localStorage.setItem("modo", "light");
      toggleBtn.textContent = "🌙";
    }
  });
});
