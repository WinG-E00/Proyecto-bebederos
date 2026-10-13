import { Router } from 'express'

// Retirado en US1: permitía crear perfiles/roles sin autenticación. El rol es único y lo
// fija el servidor; el perfil editable es PATCH /api/v1/profile (router/profile.router.js).
// app.js responde 404 a /api/perfil.
export const router = Router()
