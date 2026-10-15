import { pathToFileURL } from 'node:url'
import { loadEnv } from '../config/loadEnv.js'
import { createDatabase } from '../db/database.js'
import { workerHealthReport } from '../router/health.router.js'

// Monitoreo interno para supervisores/cron: salud de MySQL y último ciclo del worker.
// Sale con código 1 si la base no responde o el worker está atrasado o con error.
export async function checkHealth(db) {
  await db.query('SELECT 1')
  return workerHealthReport(db)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = createDatabase(loadEnv())
  checkHealth(db)
    .then((report) => {
      console.log(JSON.stringify({ database: 'up', ...report }))
      if (report.status !== 'ok') process.exitCode = 1
    })
    .catch((error) => {
      console.log(JSON.stringify({ database: 'down', status: 'degraded', errorName: error.name }))
      process.exitCode = 1
    })
    .finally(() => db.close())
}
