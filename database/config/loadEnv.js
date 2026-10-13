import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { parseEnv } from './env.js'
export function loadEnv() {
  dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })
  return parseEnv()
}
