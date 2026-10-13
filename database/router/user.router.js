import { Router } from 'express'

// Retirado en US1: registro y login legacy aceptaban rol (perfilId) del cliente, devolvían
// el hash de la contraseña y no creaban sesión. Reemplazo: POST /api/v1/auth/register y
// /api/v1/auth/login (router/auth.router.js). app.js responde 404 a /api/user.
export const router = Router()
