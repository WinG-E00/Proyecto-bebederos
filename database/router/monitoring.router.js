import { createTasksRouter } from './tasks.router.js'
import { createTeamRouter } from './team.router.js'
import { createInvitationsRouter } from './invitations.router.js'
import { createAnimalsRouter } from './animals.router.js'
import { createMapRouter } from './map.router.js'
import { createTroughsRouter } from './troughs.router.js'
import { createAccessService } from '../services/access.service.js'
import { createFarmsRouter } from './farms.router.js'
export function installMonitoringApi(app, { db, clock, mail, appUrl }) {
  const access = createAccessService(db)
  app.use('/api/v1', (req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })
  app.use('/api/v1/team', createTeamRouter({ db, access, clock }))
  app.use(
    '/api/v1/invitations',
    createInvitationsRouter({ db, access, clock, mail, appUrl }),
  )
  app.use('/api/v1', createTasksRouter({ db, access, clock }))
  app.use('/api/v1', createTroughsRouter({ db, access, clock }))
  app.use('/api/v1', createAnimalsRouter({ db, access, clock }))
  app.use('/api/v1/map', createMapRouter({ db, access }))
  app.use('/api/v1/farms', createFarmsRouter({ db, access, clock }))
}
