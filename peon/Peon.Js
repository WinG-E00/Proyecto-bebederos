function actualizarHora() {
  const ahora = new Date();

  document.getElementById("hora").textContent =
    ahora.toLocaleTimeString("es-AR");
}

setInterval(actualizarHora, 1000);

actualizarHora();

function actualizarFecha() {
  const ahora = new Date();

  const opciones = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  document.getElementById("fecha").textContent = ahora.toLocaleDateString(
    "es-AR",
    opciones,
  );
}

actualizarFecha();

const botonModo = document.getElementById("modoOscuro");

botonModo.addEventListener("click", () => {
  document.body.classList.toggle("modo-oscuro");

  const activo = document.body.classList.contains("modo-oscuro");

  if (activo) {
    botonModo.innerHTML = `
      <i class="bi bi-sun"></i>
      <span>Modo claro</span>
    `;

    localStorage.setItem("modoOscuro", "true");
  } else {
    botonModo.innerHTML = `
      <i class="bi bi-moon-stars"></i>
      <span>Modo oscuro</span>
    `;

    localStorage.setItem("modoOscuro", "false");
  }
});

const modoGuardado = localStorage.getItem("modoOscuro");

if (modoGuardado === "true") {
  document.body.classList.add("modo-oscuro");

  botonModo.innerHTML = `
    <i class="bi bi-sun"></i>
    <span>Modo claro</span>
  `;
}

function actualizarNivelAgua() {
  const nivel = Math.floor(Math.random() * 101);

  const barra = document.getElementById("barraAgua");

  const porcentaje = document.getElementById("porcentajeAgua");

  const nivelGeneral = document.getElementById("nivelGeneral");

  const estadoAgua = document.getElementById("estadoAgua");

  barra.style.width = `${nivel}%`;

  porcentaje.textContent = `${nivel}%`;

  nivelGeneral.textContent = `${nivel}%`;

  if (nivel < 30) {
    barra.style.background = "linear-gradient(90deg, #dc3545, #ef5350)";

    estadoAgua.innerHTML = `
      <span style="color:#dc3545">
        <i class="bi bi-exclamation-triangle-fill"></i>
        Nivel crítico
      </span>
    `;

    mostrarAlerta(
      "El nivel de agua del bebedero se encuentra en estado crítico.",
    );

    actualizarAlertas(1);
  } else if (nivel < 50) {
    barra.style.background = "linear-gradient(90deg, #ffc107, #ffca2c)";

    estadoAgua.innerHTML = `
      <span style="color:#d97706">
        <i class="bi bi-exclamation-circle-fill"></i>
        Nivel bajo
      </span>
    `;

    actualizarAlertas(0);
  } else {
    barra.style.background = "linear-gradient(90deg, #0d6efd, #3d8bfd)";

    estadoAgua.innerHTML = `
      <span>
        <i class="bi bi-check-circle-fill"></i>
        Nivel adecuado
      </span>
    `;

    actualizarAlertas(0);
  }
}

setInterval(actualizarNivelAgua, 5000);

function mostrarAlerta(mensaje) {
  const alerta = document.getElementById("alerta");

  const mensajeAlerta = document.getElementById("mensajeAlerta");

  mensajeAlerta.textContent = mensaje;

  alerta.classList.remove("d-none");

  setTimeout(() => {
    alerta.classList.add("d-none");
  }, 5000);
}

function actualizarAlertas(cantidad) {
  const contador = document.getElementById("cantidadAlertas");

  contador.textContent = cantidad;
}

function actualizarClima() {
  const temperaturas = ["22°C", "25°C", "27°C", "30°C", "34°C"];

  const estados = ["Soleado", "Parcialmente nublado", "Nublado", "Lluvias"];

  const temperatura =
    temperaturas[Math.floor(Math.random() * temperaturas.length)];

  const estado = estados[Math.floor(Math.random() * estados.length)];

  document.getElementById("temperatura").textContent = temperatura;

  document.getElementById("temperaturaMini").textContent = temperatura;

  document.getElementById("estadoClima").textContent = estado;
}

setInterval(actualizarClima, 10000);

actualizarClima();

actualizarNivelAgua();
actualizarFecha();
