// Mensajes concretos para los códigos del contrato de acceso; nunca revelan si una cuenta existe.
const messages = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  EMAIL_NOT_VERIFIED: 'Tenés que verificar tu correo antes de iniciar sesión. Podés pedir un nuevo enlace.',
  VALIDATION_ERROR: 'Revisá los datos ingresados.',
  TOKEN_INVALID: 'El enlace no es válido, ya se usó o venció. Pedí uno nuevo.',
  CSRF_INVALID: 'La sesión de seguridad venció. Recargá la página e intentá de nuevo.',
  RATE_LIMITED: 'Hiciste demasiados intentos. Esperá unos minutos e intentá de nuevo.',
  ACCOUNT_EXISTS: 'Ya existe una cuenta con este correo. Iniciá sesión para aceptar la invitación.',
  INVITATION_INVALID: 'La invitación no es válida para este correo, venció o fue retirada.',
  INVITATION_NOT_FOUND: 'El enlace de invitación no es válido.',
  INVITATION_EMAIL_MISMATCH: 'Esta invitación está dirigida a otro correo. Iniciá sesión con la cuenta invitada.',
  INVITATION_EXPIRED: 'La invitación venció. Pedile al dueño que te envíe una nueva.',
  INVITATION_WITHDRAWN: 'El dueño retiró esta invitación.',
  INVITATION_USED: 'Esta invitación ya fue utilizada.',
  INVITATION_NO_FARMS: 'Los campos de esta invitación ya no están disponibles.',
  ROLE_INCOMPATIBLE: 'Una cuenta de dueño no puede aceptar invitaciones de peón. Cerrá sesión e ingresá con la cuenta invitada.',
  UNAUTHENTICATED: 'Tu sesión terminó. Iniciá sesión de nuevo.',
  NETWORK_ERROR: 'No se pudo conectar con el servidor. Intentá nuevamente.',
}

export function authErrorMessage(error, fallback = 'No se pudo completar la operación. Intentá nuevamente.') {
  return messages[error?.code] ?? fallback
}

// Mismos límites que el servidor: 10 caracteres como mínimo y 72 bytes UTF-8 como máximo.
export const passwordRules = [
  { id: 'length', label: 'Al menos 10 caracteres', isValid: (value) => value.length >= 10 },
  { id: 'bytes', label: 'Hasta 72 bytes (letras con tilde o ñ ocupan más)', isValid: (value) => new TextEncoder().encode(value).length <= 72 },
]
export const isValidPassword = (value) => passwordRules.every((rule) => rule.isValid(value))

// Mensajes de enlaces de invitación inválidos (GET /invitations/preview → reason).
export const invitationReasons = {
  invalid: 'El enlace de invitación no es válido. Revisá que lo hayas copiado completo.',
  expired: 'La invitación venció. Pedile al dueño que te envíe una nueva.',
  withdrawn: 'El dueño retiró esta invitación.',
  used: 'Esta invitación ya fue utilizada.',
  no_farms: 'Los campos de esta invitación ya no están disponibles.',
}
