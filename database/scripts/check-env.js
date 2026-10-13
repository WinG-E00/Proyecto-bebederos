import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { parseEnv } from '../config/env.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })
try {
  parseEnv()
  console.log('Configuración backend válida (sin conectar a proveedores).')
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
