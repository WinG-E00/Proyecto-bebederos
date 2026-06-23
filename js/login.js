const mensaje = document.getElementById("mensajeRol");
const rol = localStorage.getItem("rol");

if (mensaje && rol) {
  if (rol === "dueno") {
    mensaje.textContent = "Ingresando como Dueño 👨‍🌾";
  } else if (rol === "peon") {
    mensaje.textContent = "Ingresando como Peón 👷";
  }
}
