const mensaje = document.getElementById("mensajeRol");
const rol = localStorage.getItem("rol");

// Variable que almacena la info de el form
const formLogin = document.getElementById("formularioLogin");
window.formLogin;



//Esto es para exponer la variable a la consola para el desarrollo
//
// event lisener de prueba para ver que formato envia formulario
formLogin.addEventListener('submit', function(event) {
  // 1. Evitamos que la página se recargue (comportamiento por defecto)
  event.preventDefault(); 
  
  // 2. Creamos el objeto FormData pasando el formulario completo
  const datos = new FormData(formLogin);
  
  // 3. Convertimos los datos en un objeto fácil de leer en JavaScript
  const datosJS = Object.fromEntries(datos.entries());
  
  console.log(datosJS); 
  // El resultado en consola será: { nombre: "Juan", correo: "juan@email.com" }
});












if (mensaje && rol) {
  if (rol === "dueno") {
    mensaje.textContent = "Ingresando como Dueño 👨‍🌾";
  } else if (rol === "peon") {
    mensaje.textContent = "Ingresando como Peón 👷";
  }
}s
