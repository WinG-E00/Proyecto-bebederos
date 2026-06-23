const cards = document.querySelectorAll(".card-rol");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    const rol = card.dataset.rol;

    // guardar rol
    localStorage.setItem("rol", rol);

    // redirigir al login
    window.location.href = "login.html";
  });
});
