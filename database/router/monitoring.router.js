import { createHistoryRouter } from './history.router.js'
import { createDashboardRouter } from './dashboard.router.js'
import { createWeatherRouter } from './weather.router.js'
import { createAlertsRouter } from './alerts.router.js'
import { createNotificationsRouter } from './notifications.router.js'
import { createTasksRouter } from './tasks.router.js'
import { createTeamRouter } from './team.router.js'
import { createInvitationsRouter } from './invitations.router.js'
import { createAnimalsRouter } from './animals.router.js'
import { createMapRouter } from './map.router.js'
import { createTroughsRouter } from './troughs.router.js'
import { createAccessService } from '../services/access.service.js'
import { createFarmsRouter } from './farms.router.js'
export function installMonitoringApi(app, { db, clock, mail, appUrl, weatherProvider }) {
  const access = createAccessService(db)
  app.use('/api/v1', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  app.use('/api/v1/alerts', createAlertsRouter({ db, access, clock }))
  app.use('/api/v1/notifications', createNotificationsRouter({ db, access, clock }))
  app.use('/api/v1', createWeatherRouter({ db, access, clock, provider: weatherProvider }))
  app.use('/api/v1', createHistoryRouter({ db, access }))
  app.use('/api/v1/dashboard', createDashboardRouter({ db, access }))
  app.use('/api/v1/team', createTeamRouter({ db, access, clock }))
  app.use(
    '/api/v1/invitations',
    createInvitationsRouter({ db, access, clock, mail, appUrl, weatherProvider }),
  )
  app.use('/api/v1', createTasksRouter({ db, access, clock }))
  app.use('/api/v1', createTroughsRouter({ db, access, clock }))
  app.use('/api/v1', createAnimalsRouter({ db, access, clock }))
  app.use('/api/v1/map', createMapRouter({ db, access }))
  app.use('/api/v1/farms', createFarmsRouter({ db, access, clock }))
}
