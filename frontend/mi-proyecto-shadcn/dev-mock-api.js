// Servidor mock liviano para desarrollo y visualización de la interfaz
// Permite navegar tanto como Dueño como Peón sin necesidad de MySQL.
import http from 'node:http'

const PORT = 3000
let currentUser = null // null = anónimo, objeto = logueado

const mockFarms = [
  { id: 1, name: 'Establecimiento La Juanita', latitude: -26.2, longitude: -58.97, areaHa: 350 },
  { id: 2, name: 'Campo El Ceibo', latitude: -26.25, longitude: -58.92, areaHa: 500 }
]

const mockTroughs = [
  { id: 1, farmId: 1, name: 'Bebedero Lote Norte', waterLevel: 85, operationalState: 'Operativo', latitude: -26.201, longitude: -58.971, capacityLiters: 1000 },
  { id: 2, farmId: 1, name: 'Bebedero Potrero 2', waterLevel: 45, operationalState: 'Operativo', latitude: -26.205, longitude: -58.975, capacityLiters: 750 },
  { id: 3, farmId: 1, name: 'Bebedero Molino Viejo', waterLevel: 18, operationalState: 'En mantenimiento', latitude: -26.208, longitude: -58.978, capacityLiters: 500 },
  { id: 4, farmId: 1, name: 'Bebedero Tanque Australiano', waterLevel: 92, operationalState: 'Operativo', latitude: -26.203, longitude: -58.972, capacityLiters: 2000 }
]

const mockTasks = [
  {
    id: 1,
    farmId: 1,
    title: 'Revisar boya y flotante en Potrero 2',
    description: 'Nivel de agua descendiendo más rápido de lo habitual. Revisar boya y sellado.',
    priority: 'Alta',
    state: 'Pendiente',
    version: 1,
    dueDate: '2026-10-28T18:00:00Z',
    deadline: '2026-10-28T18:00:00Z',
    workerId: 2,
    workerName: 'Pedro Peón',
    troughName: 'Bebedero Potrero 2',
    overdue: false,
    events: [
      { id: 1, occurredAt: '2026-10-27T10:00:00Z', actorName: 'Dueño', action: 'created', newState: 'Pendiente', comment: 'Tarea asignada automáticamente tras alerta de agua.' }
    ]
  },
  {
    id: 2,
    farmId: 1,
    title: 'Limpieza periódica Bebedero Norte',
    description: 'Retirar sedimentos acumulados y chequear sellado de compuerta principal.',
    priority: 'Media',
    state: 'En progreso',
    version: 1,
    dueDate: '2026-10-29T12:00:00Z',
    deadline: '2026-10-29T12:00:00Z',
    workerId: 2,
    workerName: 'Pedro Peón',
    troughName: 'Bebedero Lote Norte',
    overdue: false,
    events: [
      { id: 2, occurredAt: '2026-10-26T14:30:00Z', actorName: 'Pedro Peón', action: 'start', newState: 'En progreso', comment: 'Comenzando tareas de vaciado y cepillado.' }
    ]
  },
  {
    id: 3,
    farmId: 1,
    title: 'Verificar bomba solar Molino Viejo',
    description: 'Revisar cableado del panel fotovoltaico y caudal suministrado al bebedero.',
    priority: 'Alta',
    state: 'Pendiente de validación',
    version: 1,
    dueDate: '2026-10-27T08:00:00Z',
    deadline: '2026-10-27T08:00:00Z',
    workerId: 2,
    workerName: 'Pedro Peón',
    troughName: 'Bebedero Molino Viejo',
    overdue: true,
    events: [
      { id: 3, occurredAt: '2026-10-27T11:00:00Z', actorName: 'Pedro Peón', action: 'submit', newState: 'Pendiente de validación', comment: 'Se limpiaron bornes sulfatados. Bomba operando a 1200 L/h.' }
    ]
  },
  {
    id: 4,
    farmId: 2,
    title: 'Reparación de flotante y cambio de junta',
    description: 'Se reemplazó la junta de goma reseca y se calibró el nivel del flotante en el potrero 3.',
    priority: 'Baja',
    state: 'Completada',
    version: 2,
    dueDate: '2026-10-25T16:00:00Z',
    deadline: '2026-10-25T16:00:00Z',
    workerId: 3,
    workerName: 'Carlos Capataz',
    troughName: 'Bebedero Tanque Australiano',
    overdue: false,
    events: [
      { id: 4, occurredAt: '2026-10-25T17:00:00Z', actorName: 'Dueño', action: 'approve', newState: 'Completada', comment: 'Excelente trabajo, tanque funcionando perfectamente.' }
    ]
  }
]

const mockAnimals = [
  { id: 101, farmId: 1, name: 'RP 402 - Ternero Brangus', species: 'Bovino', breed: 'Brangus', ageYears: 2, state: 'Activo', lastSeen: 'Hace 20 min en Potrero 2' },
  { id: 102, farmId: 1, name: 'RP 315 - Vaca Angus', species: 'Bovino', breed: 'Angus', ageYears: 4, state: 'Activo', lastSeen: 'Hace 45 min en Lote Norte' },
  { id: 103, farmId: 1, name: 'RP 520 - Toro Hereford', species: 'Bovino', breed: 'Hereford', ageYears: 5, state: 'Activo', lastSeen: 'Hace 1 h en Potrero 2' }
]

const mockTeam = [
  { id: 2, name: 'Pedro Peón', email: 'peon@bebederos-piloto.invalid', farmIds: [1, 2] },
  { id: 3, name: 'Carlos Capataz', email: 'carlos@bebederos-piloto.invalid', farmIds: [1] },
  { id: 4, name: 'Lucas Molinero', email: 'lucas@bebederos-piloto.invalid', farmIds: [2] }
]

const mockInvitations = [
  { id: 1, email: 'roberto.alambrador@gmail.com', state: 'Pendiente', deliveryState: 'Enviado', expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(), farmIds: [1] },
  { id: 2, email: 'martin.tractorista@campo.com', state: 'Pendiente', deliveryState: 'Enviado', expiresAt: new Date(Date.now() + 5 * 86400000).toISOString(), farmIds: [1, 2] }
]

const mockAlerts = [
  { id: 1, farmId: 1, resourceType: 'trough', resourceId: 3, message: 'Bebedero Molino Viejo por debajo del 20% (Nivel crítico: 18%)', generatedAt: '2026-10-27T12:00:00Z', resolvedAt: null },
  { id: 2, farmId: 1, resourceType: 'animal', resourceId: 101, message: 'RP 402 no registra visitas al bebedero en las últimas 28 horas', generatedAt: '2026-10-27T10:15:00Z', resolvedAt: null },
  { id: 3, farmId: 1, resourceType: 'trough', resourceId: 1, message: 'Bebedero Lote Norte recuperó nivel óptimo (85%)', generatedAt: '2026-10-26T18:00:00Z', resolvedAt: '2026-10-26T21:30:00Z' }
]

const mockNotifications = [
  { id: 1, message: 'Pedro Peón envió a validación la tarea: "Verificar bomba solar Molino Viejo"', occurredAt: '2026-10-27T11:00:00Z', readAt: null },
  { id: 2, message: 'Alerta crítica emitida en Potrero 2 por nivel bajo de agua', occurredAt: '2026-10-27T09:30:00Z', readAt: '2026-10-27T10:00:00Z' },
  { id: 3, message: 'Se asignó la tarea "Limpieza periódica Bebedero Norte" a Pedro Peón', occurredAt: '2026-10-26T14:00:00Z', readAt: '2026-10-26T14:10:00Z' }
]

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`)
  const path = parsedUrl.pathname
  const query = parsedUrl.searchParams

  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  }

  // Rutas de autenticación
  if (path === '/api/v1/auth/csrf') {
    return sendJson(200, { csrfToken: 'dev-mock-csrf-token' })
  }

  if (path === '/api/v1/auth/me') {
    if (!currentUser) {
      return sendJson(401, { code: 'UNAUTHENTICATED', message: 'Iniciá sesión para continuar.' })
    }
    return sendJson(200, { account: currentUser })
  }

  if (path === '/api/v1/auth/login' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      let parsed = {}
      try { parsed = JSON.parse(body) } catch {}
      const email = (parsed.email || '').toLowerCase().trim()
      
      const isOwner = email.includes('duen') || email.includes('dueñ') || email.includes('owner') || email.startsWith('ana')
      
      currentUser = {
        id: isOwner ? 1 : 2,
        name: isOwner ? 'Dueño' : (parsed.email ? (parsed.email.includes('@') ? parsed.email.split('@')[0] : parsed.email) : 'Pedro Peón'),
        email: parsed.email || (isOwner ? 'duenio-a@bebederos-piloto.invalid' : 'peon@bebederos-piloto.invalid'),
        role: isOwner ? 'owner' : 'worker'
      }
      return sendJson(200, { account: currentUser })
    })
    return
  }

  if (path === '/api/v1/auth/logout' && req.method === 'POST') {
    currentUser = null
    res.writeHead(204)
    res.end()
    return
  }

  if (path === '/api/v1/auth/register' && req.method === 'POST') {
    return sendJson(202, { account: null, needsVerification: true, message: 'Registro simulado con éxito.' })
  }

  // Rutas de datos
  if (path === '/api/v1/farms') {
    return sendJson(200, { items: mockFarms, total: mockFarms.length })
  }

  if (path === '/api/v1/dashboard') {
    return sendJson(200, {
      farms: mockFarms.length,
      animals: mockAnimals.length,
      troughs: mockTroughs.length,
      workers: mockTeam.length,
      water: { low: 1, critical: 0, missing: 0 },
      activeAlerts: mockAlerts.filter(a => !a.resolvedAt).length,
      tasks: { pending: 1, inProgress: 1, validation: 1, total: mockTasks.length },
      map: []
    })
  }

  if (path === '/api/v1/troughs') {
    return sendJson(200, { items: mockTroughs, total: mockTroughs.length })
  }

  if (path === '/api/v1/tasks') {
    const taskId = query.get('id')
    if (taskId) {
      const task = mockTasks.find(t => String(t.id) === String(taskId)) || mockTasks[0]
      return sendJson(200, task)
    }
    const stateFilter = query.get('state')
    let items = mockTasks
    if (stateFilter) {
      items = items.filter(t => t.state === stateFilter)
    }
    return sendJson(200, { items, total: items.length })
  }

  if (path.startsWith('/api/v1/tasks/') && path.endsWith('/actions') && req.method === 'POST') {
    return sendJson(200, { ok: true })
  }

  if (path.startsWith('/api/v1/farms/') && path.endsWith('/tasks') && req.method === 'POST') {
    return sendJson(201, { ok: true, id: Date.now() })
  }

  if (path === '/api/v1/animals') {
    return sendJson(200, { items: mockAnimals, total: mockAnimals.length })
  }

  if (path === '/api/v1/alerts') {
    const activeFilter = query.get('active')
    const filtered = activeFilter === 'false' 
      ? mockAlerts.filter(a => a.resolvedAt !== null)
      : mockAlerts.filter(a => a.resolvedAt === null)
    return sendJson(200, { items: filtered, total: filtered.length })
  }

  if (path === '/api/v1/notifications') {
    return sendJson(200, { items: mockNotifications, total: mockNotifications.length })
  }

  if (path.startsWith('/api/v1/notifications/') && path.endsWith('/read')) {
    const id = Number(path.split('/')[4])
    const notif = mockNotifications.find(n => n.id === id)
    if (notif) notif.readAt = new Date().toISOString()
    return sendJson(200, { ok: true })
  }

  if (path === '/api/v1/team') {
    return sendJson(200, { items: mockTeam, total: mockTeam.length })
  }

  if (path.startsWith('/api/v1/team/') && path.endsWith('/assignments') && req.method === 'PUT') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      let parsed = {}
      try { parsed = JSON.parse(body) } catch {}
      const workerId = Number(path.split('/')[4])
      const worker = mockTeam.find(w => w.id === workerId)
      if (worker && Array.isArray(parsed.farmIds)) {
        worker.farmIds = parsed.farmIds
      }
      return sendJson(200, { ok: true })
    })
    return
  }

  if (path === '/api/v1/invitations') {
    if (req.method === 'POST') {
      return sendJson(201, { ok: true, message: 'Invitación creada.' })
    }
    return sendJson(200, { items: mockInvitations, total: mockInvitations.length })
  }

  if (path.startsWith('/api/v1/invitations/') && path.endsWith('/retry')) {
    return sendJson(200, { ok: true })
  }

  if (path.startsWith('/api/v1/invitations/') && req.method === 'DELETE') {
    return sendJson(200, { ok: true })
  }

  if (path === '/api/v1/history') {
    return sendJson(200, { items: [], total: 0 })
  }

  // 404 por defecto
  sendJson(404, { code: 'NOT_FOUND', message: 'Ruta no encontrada en mock' })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Mock API] Servidor de desarrollo escuchando en http://127.0.0.1:${PORT}`)
})
