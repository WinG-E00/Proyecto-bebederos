function actualizarHora() {
  const ahora = new Date();

  document.getElementById("hora").textContent = ahora.toLocaleTimeString();
}

setInterval(actualizarHora, 1000);
actualizarHora();

const botonModo = document.getElementById("modoOscuro");

botonModo.addEventListener("click", () => {
  document.body.classList.toggle("modo-oscuro");
});

function actualizarNivelAgua() {
  let nivel = Math.floor(Math.random() * 100);

  const barra = document.getElementById("barraAgua");

  barra.style.width = nivel + "%";
  barra.textContent = nivel + "%";

  if (nivel < 30) {
    barra.className = "progress-bar bg-danger";

    mostrarAlerta(" Bebedero en estado crítico!!!.");
  } else {
    barra.className = "progress-bar bg-primary";
  }
}

setInterval(actualizarNivelAgua, 5000);

function mostrarAlerta(mensaje) {
  const alerta = document.getElementById("alerta");

  alerta.textContent = mensaje;

  alerta.classList.remove("d-none");

  setTimeout(() => {
    alerta.classList.add("d-none");
  }, 5000);
}

function actualizarClima() {
  const temperaturas = ["22°C", "25°C", "27°C", "30°C", "34°C"];

  const estados = [" Soleado", " Nublado", " Lluvias", " Tormenta"];

  document.getElementById("temperatura").textContent =
    temperaturas[Math.floor(Math.random() * temperaturas.length)];

  document.getElementById("estadoClima").textContent =
    estados[Math.floor(Math.random() * estados.length)];
}

setInterval(actualizarClima, 10000);
