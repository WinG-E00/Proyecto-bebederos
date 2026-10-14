import { Router } from 'express'
import { requireAccount, requireOwner } from '../middleware/authorization.js'
import { validate } from '../middleware/validate.js'
import {
  taskSchema,
  taskListSchema,
  taskActionSchema,
} from '../services/task.schemas.js'
import { createTaskService } from '../services/task.service.js'
import { createTaskActions } from '../services/taskActions.service.js'
export function createTasksRouter({ db, access, clock }) {
  const r = Router(),
    s = createTaskService(db, { clock }),
    actions = createTaskActions(db, { clock })
  r.use(requireAccount(access))
  r.get('/tasks', validate(taskListSchema, 'query'), async (req, res) =>
    res.json(await s.list(req.account, req.validated.query)),
  )
  r.get('/tasks/:id', async (req, res) =>
    res.json(await s.detail(req.account, req.params.id)),
  )
  r.post(
    '/farms/:id/tasks',
    requireOwner,
    validate(taskSchema),
    async (req, res) =>
      res
        .status(201)
        .json(await s.create(req.account, req.params.id, req.validated.body)),
  )
  r.post('/tasks/:id/actions', validate(taskActionSchema), async (req, res) =>
    res.json(await actions.act(req.account, req.params.id, req.validated.body)),
  )
  return r
}
