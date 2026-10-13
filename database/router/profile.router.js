import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAccount } from '../middleware/authorization.js'
import { profileSchema } from '../services/auth.schemas.js'

// Perfil: nombre editable; rol y correo no son editables en el MVP.
export function createProfileRouter({ auth, access }) {
  const router = Router()
  router.patch('/', requireAccount(access), validate(profileSchema), async (req, res) => {
    res.json({ account: await auth.updateProfile(req.account.id, req.validated.body) })
  })
  return router
}
