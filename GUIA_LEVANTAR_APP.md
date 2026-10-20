# Cómo levantar la app completa en desarrollo

Ejecutá los comandos desde la raíz del repositorio. Necesitás Node.js 22, npm y Podman.

La app tiene cuatro componentes:

| Componente | Dirección o función |
| --- | --- |
| MySQL | `127.0.0.1:33307`, contenedor `bebederos-dev-mysql` |
| Backend (carpeta `database`) | `http://127.0.0.1:3000` |
| Worker | Procesa muestras, alertas, invitaciones y correos cada 5 segundos |
| Frontend | `http://localhost:5173` |

La carpeta `database` contiene el backend; MySQL corre aparte, en el contenedor.

## Arranque habitual

### 1. Iniciar MySQL y comprobar la configuración

```bash
podman start bebederos-dev-mysql
npm run check:env --prefix database
```

Esperá a que MySQL termine de arrancar. Podés revisar el estado con:

```bash
podman logs --tail 20 bebederos-dev-mysql
```

Cuando aparezca `ready for connections`, verificá/aplicá las migraciones:

```bash
npm run migrate --prefix database
```

Si dice `Migraciones aplicadas: 0`, la base ya está actualizada. Este comando no borra tablas ni registros.

### 2. Iniciar el backend en una terminal

```bash
npm run dev --prefix database
```

Dejá esa terminal abierta. El modo desarrollo reinicia el backend cuando cambia su código.

### 3. Iniciar el worker en otra terminal

```bash
npm run worker --prefix database
```

Dejá esa terminal abierta. Ejecutá una sola instancia del worker por base.

### 4. Iniciar el frontend en otra terminal

```bash
npm run dev --prefix frontend/mi-proyecto-shadcn -- --host localhost --port 5173 --strictPort
```

Abrí **http://localhost:5173**. Dejá la terminal abierta.
Vite reenvía las solicitudes `/api` al backend del puerto 3000.
Usá `localhost:5173`, que coincide con el `APP_URL` configurado.

## Verificar que todo funciona

```bash
curl --fail http://localhost:5173/api/v1/health
npm run health --prefix database
```

El primer comando debe devolver `status: "ok"` y `database: "up"`.
El segundo comprueba también el último ciclo del worker; esperá unos segundos después de iniciarlo.

## Preparación si faltan dependencias o configuración

Para instalar las dependencias de ambos proyectos:

```bash
npm ci --prefix database
npm ci --prefix frontend/mi-proyecto-shadcn
```

La configuración local está en `database/.env`. Si no existe, creala a partir de
`database/.env.example` y completá sus valores. No sobrescribas un `.env` existente.
Para el contenedor de desarrollo de esta máquina se usa:

```dotenv
NODE_ENV=development
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=33307
DB_NAME=bebederos_dev
DB_USER=bebederos_dev
APP_URL=http://localhost:5173
```

`DB_PASSWORD` debe coincidir con la contraseña del usuario MySQL.
`SESSION_SECRET` y `OUTBOX_SECRET` deben ser distintos y tener al menos 32 bytes;
podés generar cada uno ejecutando:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Las contraseñas y los secretos quedan únicamente en tu `.env` local.
Esta guía utiliza el contenedor existente: en otra máquina primero hay que preparar
MySQL 8.0.16+ con la base y el usuario correspondientes. Ver
[la guía de operación](database/deployment/README.md) para los requisitos de MySQL.

### Datos de prueba (opcional)

La base actual conserva sus datos; no hace falta ejecutar el seed en cada arranque.
Para cargar el piloto en una base de desarrollo, configurá `DEMO_PASSWORD` en
`database/.env` y ejecutá después de las migraciones:

```bash
npm run seed --prefix database
```

El seed solo se permite en desarrollo o pruebas y es idempotente.

## Apagar la app

1. Presioná `Ctrl+C` en las terminales del frontend, backend y worker.
2. Detené MySQL si ya no lo necesitás:

```bash
podman stop bebederos-dev-mysql
```

Detener el contenedor conserva los datos.

## Problemas frecuentes

- **No conecta a MySQL:** verificá que `bebederos-dev-mysql` esté iniciado, que el log diga `ready for connections` y que el `.env` use el puerto `33307` y las credenciales correctas.
- **Faltan migraciones:** ejecutá `npm run migrate --prefix database` antes de iniciar backend y worker.
- **Puerto 5173 o 3000 ocupado:** cerrá la instancia anterior antes de iniciar otra. `--strictPort` evita que Vite cambie de puerto y deje de coincidir con `APP_URL`.
- **El frontend abre pero falla `/api`:** comprobá que el backend esté activo en el puerto 3000.
- **Salud del worker degradada:** comprobá que su terminal siga abierta y revisá sus logs; volvé a ejecutar `npm run health --prefix database` tras unos segundos.
- **Clima o correo no disponibles:** requieren configurar `WEATHER_API_KEY` y las variables `SMTP_*`, respectivamente. Levantar los procesos no configura esos proveedores.

Guía de desarrollo local verificada el 20/10/2026: frontend y API respondiendo, MySQL conectado y worker iniciado.
