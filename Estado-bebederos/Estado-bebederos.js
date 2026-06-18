const bebederos = [
  {
    id: 1,
    ubicacion: "Potrero Norte",
    porcentaje: 85,
  },
  {
    id: 2,
    ubicacion: "Potrero Sur",
    porcentaje: 40,
  },
  {
    id: 3,
    ubicacion: "Lote 5",
    porcentaje: 20,
  },
  {
    id: 4,
    ubicacion: "Corral Principal",
    porcentaje: 70,
  },
];

function obtenerColor(porcentaje) {
  if (porcentaje > 60) {
    return "green";
  }

  if (porcentaje > 30) {
    return "orange";
  }

  return "red";
}

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

            <button
                class="btn"
                onclick="actualizarNivel(${bebedero.id})">
                Actualizar
            </button>
        `;

    contenedor.appendChild(card);
  });
}

function actualizarNivel(id) {
  const bebedero = bebederos.find((b) => b.id === id);

  bebedero.porcentaje = Math.floor(Math.random() * 101);

  mostrarBebederos();
}

mostrarBebederos();

const bebederos = [
  {
    id: 1,
    ubicacion: "Bebedero Norte",
    porcentaje: 80,
    lat: -34.6037,
    lng: -58.3816,
  },
  {
    id: 2,
    ubicacion: "Bebedero Sur",
    porcentaje: 45,
    lat: -34.6137,
    lng: -58.3916,
  },
  {
    id: 3,
    ubicacion: "Bebedero Este",
    porcentaje: 20,
    lat: -34.5937,
    lng: -58.3716,
  },
];
