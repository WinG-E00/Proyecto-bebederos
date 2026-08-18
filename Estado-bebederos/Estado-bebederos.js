const bebederos = [
  {
    id: 1,
    ubicacion: "Potrero Norte",
    porcentaje: 85,
    temperatura: 22,
    indiceHidratacion: 84,
    estado: "🟢 Hidratación adecuada",
    tiempoBebiendo: "1 min 48 s",
    visitasHoy: 6,
    ultimaVisita: "14:35",
    caravana: 2548,
    anioCaravana: 2024,
    lat: -34.6037,
    lng: -58.3816,
  },
  {
    id: 2,
    ubicacion: "Potrero Sur",
    porcentaje: 40,
    temperatura: 26,
    indiceHidratacion: 48,
    estado: "🟡 Riesgo bajo",
    tiempoBebiendo: "58 s",
    visitasHoy: 3,
    ultimaVisita: "12:10",
    caravana: 3171,
    anioCaravana: 2023,
    lat: -34.6137,
    lng: -58.3916,
  },
  {
    id: 3,
    ubicacion: "Lote 5",
    porcentaje: 20,
    temperatura: 30,
    indiceHidratacion: 31,
    estado: "🟠 Riesgo moderado",
    tiempoBebiendo: "25 s",
    visitasHoy: 2,
    ultimaVisita: "09:40",
    caravana: 4156,
    anioCaravana: 2022,
    lat: -34.5937,
    lng: -58.3716,
  },
  {
    id: 4,
    ubicacion: "Corral Principal",
    porcentaje: 70,
    temperatura: 28,
    indiceHidratacion: 18,
    estado: "🔴 Riesgo alto",
    tiempoBebiendo: "15 s",
    visitasHoy: 1,
    ultimaVisita: "Hace 8 horas",
    caravana: 5298,
    anioCaravana: 2021,
    lat: -34.608,
    lng: -58.384,
  },
];

function obtenerColor(porcentaje) {
  if (porcentaje > 60) return "green";
  if (porcentaje > 30) return "orange";
  return "red";
}

function obtenerEstado(indice) {
  if (indice >= 76) return "🟢 Hidratación adecuada";
  if (indice >= 51) return "🟡 Riesgo bajo";
  if (indice >= 26) return "🟠 Riesgo moderado";
  return "🔴 Riesgo alto";
}

function mostrarBebederos() {
  const contenedor = document.getElementById("contenedor");
  contenedor.innerHTML = "";

  bebederos.forEach((bebedero) => {
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <h2>Bebedero ${bebedero.id}</h2>

      <p><strong>📍 Ubicación:</strong> ${bebedero.ubicacion}</p>

      <p><strong>🐄 Caravana:</strong> ${bebedero.caravana}/${bebedero.anioCaravana}</p>

      <p><strong>💧 Nivel de agua:</strong> ${bebedero.porcentaje}%</p>

      <div class="barra">
        <div
          class="nivel"
          style="
            width:${bebedero.porcentaje}%;
            background:${obtenerColor(bebedero.porcentaje)};
          ">
        </div>
      </div>

      <p><strong>🌡️ Temperatura del agua:</strong> ${bebedero.temperatura} °C</p>

      <hr>

      <p><strong>🕒 Última visita:</strong> ${bebedero.ultimaVisita}</p>

      <p><strong>⏱️ Tiempo bebiendo:</strong> ${bebedero.tiempoBebiendo}</p>

      <p><strong>🚰 Visitas hoy:</strong> ${bebedero.visitasHoy}</p>

      <hr>

      <p><strong>💙 Índice de hidratación:</strong> ${bebedero.indiceHidratacion}%</p>

      <p style="font-weight:bold;">
        Estado: ${bebedero.estado}
      </p>

      <button class="btn" onclick="actualizarNivel(${bebedero.id})">
        Actualizar
      </button>
    `;

    contenedor.appendChild(card);
  });
}

function actualizarNivel(id) {
  const bebedero = bebederos.find((b) => b.id === id);

  // Datos ficticios
  bebedero.porcentaje = Math.floor(Math.random() * 101);
  bebedero.temperatura = Math.floor(Math.random() * 21) + 15;
  bebedero.indiceHidratacion = Math.floor(Math.random() * 101);
  bebedero.estado = obtenerEstado(bebedero.indiceHidratacion);
  bebedero.visitasHoy = Math.floor(Math.random() * 8) + 1;
  bebedero.tiempoBebiendo =
    Math.floor(Math.random() * 2 + 1) +
    " min " +
    Math.floor(Math.random() * 60) +
    " s";

  const hora = Math.floor(Math.random() * 24)
    .toString()
    .padStart(2, "0");

  const minuto = Math.floor(Math.random() * 60)
    .toString()
    .padStart(2, "0");

  bebedero.ultimaVisita = `${hora}:${minuto}`;

  mostrarBebederos();
  actualizarMapa();
}

mostrarBebederos();

const mapa = L.map("mapa").setView([-34.6037, -58.3816], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(mapa);

const marcadores = [];

function actualizarMapa() {
  marcadores.forEach((m) => mapa.removeLayer(m));
  marcadores.length = 0;

  bebederos.forEach((bebedero) => {
    const marcador = L.marker([bebedero.lat, bebedero.lng]).addTo(mapa)
      .bindPopup(`
        <h3>${bebedero.ubicacion}</h3>

        <b>🐄 Caravana:</b> ${bebedero.caravana}/${bebedero.anioCaravana}<br>

        <b>💧 Nivel de agua:</b> ${bebedero.porcentaje}%<br>

        <b>🌡️ Temperatura del agua:</b> ${bebedero.temperatura} °C<br>

        <b>🕒 Última visita:</b> ${bebedero.ultimaVisita}<br>

        <b>⏱️ Tiempo bebiendo:</b> ${bebedero.tiempoBebiendo}<br>

        <b>🚰 Visitas hoy:</b> ${bebedero.visitasHoy}<br>

        <hr>

        <b>💙 Índice de hidratación:</b> ${bebedero.indiceHidratacion}%<br>

        <b>${bebedero.estado}</b>
      `);

    marcadores.push(marcador);
  });
}

actualizarMapa();
