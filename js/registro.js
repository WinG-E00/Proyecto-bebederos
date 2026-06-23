const form = document.querySelector("form");

const passwordInput = document.getElementById("password");

const ruleLength = document.getElementById("rule-length");
const ruleUppercase = document.getElementById("rule-uppercase");
const ruleNumber = document.getElementById("rule-number");

const strengthText = document.getElementById("passwordStrength");
const errorGeneral = document.getElementById("errorGeneral");
const mensajeExito = document.getElementById("registroExitoso");

// VALIDACIÓN EN TIEMPO REAL
passwordInput.addEventListener("input", () => {
  const value = passwordInput.value;

  let score = 0;

  if (value.length >= 6) {
    ruleLength.textContent = "✔ Mínimo 6 caracteres";
    ruleLength.classList.add("ok");
    score++;
  } else {
    ruleLength.textContent = "❌ Mínimo 6 caracteres";
    ruleLength.classList.remove("ok");
  }

  if (/[A-Z]/.test(value)) {
    ruleUppercase.textContent = "✔ Una mayúscula";
    ruleUppercase.classList.add("ok");
    score++;
  } else {
    ruleUppercase.textContent = "❌ Una mayúscula";
    ruleUppercase.classList.remove("ok");
  }

  if (/[0-9]/.test(value)) {
    ruleNumber.textContent = "✔ Un número";
    ruleNumber.classList.add("ok");
    score++;
  } else {
    ruleNumber.textContent = "❌ Un número";
    ruleNumber.classList.remove("ok");
  }

  // FUERZA
  strengthText.className = "";

  if (score === 1) {
    strengthText.textContent = "Contraseña débil";
    strengthText.classList.add("debil");
  } else if (score === 2) {
    strengthText.textContent = "Contraseña media";
    strengthText.classList.add("media");
  } else if (score === 3) {
    strengthText.textContent = "Contraseña fuerte";
    strengthText.classList.add("fuerte");
  } else {
    strengthText.textContent = "";
  }
});

// SUBMIT
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = passwordInput.value;

  errorGeneral.textContent = "";
  mensajeExito.textContent = "";

  if (!email || !password) {
    errorGeneral.textContent = "Completá todos los campos";
    return;
  }

  if (
    password.length < 6 ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    errorGeneral.textContent = "La contraseña no cumple las reglas";
    return;
  }

  const usuario = {
    email: email,
    password: password,
  };

  localStorage.setItem("usuario", JSON.stringify(usuario));

  mensajeExito.textContent = "✅ Registro exitoso";

  setTimeout(() => {
    window.location.href = "login.html";
  }, 1500);
});
