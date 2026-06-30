const bebederos = [
  {
    id: 1,
    ubicacion: "Potrero Norte",
    porcentaje: 85,
    lat: -34.6037,
    lng: -58.3816,
  },
  {
    id: 2,
    ubicacion: "Potrero Sur",
    porcentaje: 40,
    lat: -34.6137,
    lng: -58.3916,
  },
  {
    id: 3,
    ubicacion: "Lote 5",
    porcentaje: 20,
    lat: -34.5937,
    lng: -58.3716,
  },
  {
    id: 4,
    ubicacion: "Corral Principal",
    porcentaje: 70,
    lat: -34.608,
    lng: -58.384,
  },
];

// Devuelve el color según el porcentaje
function obtenerColor(porcentaje) {
  if (porcentaje > 60) {
    return "green";
  }

  if (porcentaje > 30) {
    return "orange";
  }

  return "red";
}

// Muestra las tarjetas de los bebederos
function mostrarBebederos() {
  const contenedor = document.getElementById("contenedor");

  contenedor.innerHTML = "";

  bebederos.forEach((bebedero) => {
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
      <h2>Bebedero ${bebedero.id}</h2>

      <p class="ubicacion">
        📍 ${bebedero.ubicacion}
      </p>

      <p class="porcentaje">
        ${bebedero.porcentaje}%
      </p>

      <div class="barra">
        <div
          class="nivel"
          style="
            width:${bebedero.porcentaje}%;
            background:${obtenerColor(bebedero.porcentaje)};
          ">
        </div>
      </div>

      <button class="btn" onclick="actualizarNivel(${bebedero.id})">
        Actualizar
      </button>
    `;

    contenedor.appendChild(card);
  });
}

// Actualiza el porcentaje aleatoriamente
function actualizarNivel(id) {
  const bebedero = bebederos.find((b) => b.id === id);

  bebedero.porcentaje = Math.floor(Math.random() * 101);

  mostrarBebederos();
  actualizarMapa();
}

// Mostrar tarjetas al cargar
mostrarBebederos();

// =======================
// MAPA LEAFLET
// =======================

const mapa = L.map("mapa").setView([-34.6037, -58.3816], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(mapa);

const marcadores = [];

// Dibuja los marcadores
function actualizarMapa() {
  // Eliminar marcadores anteriores
  marcadores.forEach((m) => mapa.removeLayer(m));
  marcadores.length = 0;

  bebederos.forEach((bebedero) => {
    const marcador = L.marker([bebedero.lat, bebedero.lng]).addTo(mapa)
      .bindPopup(`
        <strong>${bebedero.ubicacion}</strong><br>
        Nivel de agua: ${bebedero.porcentaje}%<br>
        Estado:
        <span style="color:${obtenerColor(bebedero.porcentaje)}">
          ${obtenerColor(bebedero.porcentaje).toUpperCase()}
        </span>
      `);

    marcadores.push(marcador);
  });
}

actualizarMapa();
