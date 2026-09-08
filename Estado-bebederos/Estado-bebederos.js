const bebederos = [
  {
    id: 1,
    ubicacion: "Casa",
    porcentaje: 85,
    temperatura: 22,
    indiceHidratacion: 84,
    estado: "🟢 Hidratación adecuada",
    claseEstado: "verde",
    tiempoBebiendo: "1 min 48 s",
    visitasHoy: 6,
    ultimaVisita: "14:35",
    caravana: 2548,
    anioCaravana: 2024,
    lat: -26.215246,
    lng: -58.970338,
  },
  {
    id: 2,
    ubicacion: "Medio",
    porcentaje: 40,
    temperatura: 26,
    indiceHidratacion: 48,
    estado: "🟡 Riesgo bajo",
    claseEstado: "amarillo",
    tiempoBebiendo: "58 s",
    visitasHoy: 3,
    ultimaVisita: "12:10",
    caravana: 3171,
    anioCaravana: 2023,
    lat: -26.225179,
    lng: -58.96781,
  },
  {
    id: 3,
    ubicacion: "Zalinas",
    porcentaje: 20,
    temperatura: 30,
    indiceHidratacion: 31,
    estado: "🟠 Riesgo moderado",
    claseEstado: "naranja",
    tiempoBebiendo: "25 s",
    visitasHoy: 2,
    ultimaVisita: "09:40",
    caravana: 4156,
    anioCaravana: 2022,
    lat: -26.275742,
    lng: -58.969547,
  },
];
function obtenerGradienteBarra(porcentaje) {
  if (porcentaje > 60) return "linear-gradient(90deg, #198754, #20c997)";
  if (porcentaje > 30) return "linear-gradient(90deg, #fd7e14, #ffc107)";
  return "linear-gradient(90deg, #dc3545, #f87171)";
}

function obtenerEstado(indice) {
  if (indice >= 76) return { texto: "🟢 Hidratación adecuada", clase: "verde" };
  if (indice >= 51) return { texto: "🟡 Riesgo bajo", clase: "amarillo" };
  if (indice >= 26) return { texto: "🟠 Riesgo moderado", clase: "naranja" };
  return { texto: "🔴 Riesgo alto", clase: "rojo" };
}

function mostrarBebederos() {
  const contenedor = document.getElementById("contenedor");
  contenedor.innerHTML = "";

  bebederos.forEach((b) => {
    const card = document.createElement("div");
    card.classList.add("dashboard-card");

    card.innerHTML = `
      <div class="card-header-custom">
        <div>
          <span class="section-label">UBICACIÓN</span>
          <h2><i class="bi bi-geo-alt"></i> ${b.ubicacion}</h2>
          <p>Bebedero Módulo #${b.id}</p>
        </div>
        <span class="status-badge ${b.claseEstado}">
          ${b.estado}
        </span>
      </div>

      <div class="nivel-header">
        <span><i class="bi bi-droplet-fill"></i> Nivel de Agua</span>
        <strong>${b.porcentaje}%</strong>
      </div>

      <div class="progress-custom">
        <div class="progress-bar" style="width: ${b.porcentaje}%; background: ${obtenerGradienteBarra(b.porcentaje)};"></div>
      </div>

      <div class="nivel-info">
        <span><i class="bi bi-thermometer-half"></i> Temp: ${b.temperatura} °C</span>
        <span><i class="bi bi-activity"></i> Hidratación: ${b.indiceHidratacion}%</span>
      </div>

      <div class="info-row-list">
        <div class="info-item"><span>Caravana:</span> <strong>🐄 ${b.caravana}/${b.anioCaravana}</strong></div>
        <div class="info-item"><span>Última visita:</span> <strong>🕒 ${b.ultimaVisita}</strong></div>
      
        <div class="info-item"><span>Visitas hoy:</span> <strong>🚰 ${b.visitasHoy}</strong></div>
      </div>

      <button class="btn-primary-custom" onclick="actualizarNivel(${b.id})">
        <i class="bi bi-arrow-repeat"></i> Actualizar Medición
      </button>
    `;

    contenedor.appendChild(card);
  });
}

function actualizarNivel(id) {
  const bebedero = bebederos.find((b) => b.id === id);

  bebedero.porcentaje = Math.floor(Math.random() * 101);
  bebedero.temperatura = Math.floor(Math.random() * 21) + 15;
  bebedero.indiceHidratacion = Math.floor(Math.random() * 101);

  const resEstado = obtenerEstado(bebedero.indiceHidratacion);
  bebedero.estado = resEstado.texto;
  bebedero.claseEstado = resEstado.clase;

  bebedero.visitasHoy = Math.floor(Math.random() * 8) + 1;

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

function toggleModoOscuro() {
  document.body.classList.toggle("modo-oscuro");
}

// Inicializar Mapa Leaflet
const mapa = L.map("mapa").setView([-34.6037, -58.3816], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(mapa);

const marcadores = [];

function actualizarMapa() {
  marcadores.forEach((m) => mapa.removeLayer(m));
  marcadores.length = 0;

  bebederos.forEach((b) => {
    const marcador = L.marker([b.lat, b.lng]).addTo(mapa).bindPopup(`
      <div style="font-size:13px;">
        <h4 style="margin:0 0 6px; color:#198754;">${b.ubicacion} (Bebedero ${b.id})</h4>
        <b>Caravana:</b> ${b.caravana}/${b.anioCaravana}<br>
        <b>Nivel de agua:</b> ${b.porcentaje}%<br>
        <b>Temperatura:</b> ${b.temperatura} °C<br>
        <b>Estado:</b> ${b.estado}
      </div>
    `);

    marcadores.push(marcador);
  });
}

// Cargar Fecha Actual en Dashboard
const opcionesFecha = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};
document.getElementById("fecha-actual").innerText =
  new Date().toLocaleDateString("es-ES", opcionesFecha);

mostrarBebederos();
actualizarMapa();
