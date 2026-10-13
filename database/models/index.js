import { defineHistoryEvent } from './HistoryEvent.model.js'
import { defineMailOutbox } from './MailOutbox.model.js'
import { defineWorkerState } from './WorkerState.model.js'

export function registerModels(db) {
  // Los modelos legacy no se importan; los dominios se añadirán en sus historias.
  const HistoryEvent = db.models.HistoryEvent ?? defineHistoryEvent(db)
  const MailOutbox = db.models.MailOutbox ?? defineMailOutbox(db)
  const WorkerState = db.models.WorkerState ?? defineWorkerState(db)
  return { HistoryEvent, MailOutbox, WorkerState }
}
