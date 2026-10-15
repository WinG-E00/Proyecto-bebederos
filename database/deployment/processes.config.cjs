// Supervisión de procesos con PM2 (https://pm2.keymetrics.io/docs/usage/application-declaration/).
// No despliega nada por sí mismo: usar en el servidor con `pm2 start deployment/processes.config.cjs`.
// Las variables se leen de database/.env (fuera del repositorio); aquí no hay secretos.
module.exports = {
  apps: [
    {
      name: 'bebederos-api',
      cwd: __dirname + '/..',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // SIGTERM: la API deja de aceptar conexiones y espera las respuestas en curso.
      kill_timeout: 15000,
      env: { NODE_ENV: 'production' },
      out_file: '/var/log/bebederos/api.log',
      error_file: '/var/log/bebederos/api.err.log',
      merge_logs: true,
    },
    {
      // Una sola instancia: el worker toma un bloqueo MySQL y rechaza duplicados.
      name: 'bebederos-worker',
      cwd: __dirname + '/..',
      script: 'workers/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // SIGTERM: termina el ciclo en curso, libera el bloqueo y cierra conexiones.
      kill_timeout: 30000,
      env: { NODE_ENV: 'production' },
      out_file: '/var/log/bebederos/worker.log',
      error_file: '/var/log/bebederos/worker.err.log',
      merge_logs: true,
    },
  ],
}
