import { defineAccount } from './Account.model.js'
import { defineHistoryEvent } from './HistoryEvent.model.js'
import { defineIdentityToken } from './IdentityToken.model.js'
import { defineMailOutbox } from './MailOutbox.model.js'
import { defineWorkerState } from './WorkerState.model.js'
import { defineSession } from '../services/session.service.js'

export function registerModels(db) {
  // Los modelos legacy no se importan; los dominios se añadirán en sus historias.
  const HistoryEvent = db.models.HistoryEvent ?? defineHistoryEvent(db)
  const MailOutbox = db.models.MailOutbox ?? defineMailOutbox(db)
  const WorkerState = db.models.WorkerState ?? defineWorkerState(db)
  const Account = db.models.Account ?? defineAccount(db)
  const IdentityToken = db.models.IdentityToken ?? defineIdentityToken(db)
  const Session = db.models.Session ?? defineSession(db)
  return { HistoryEvent, MailOutbox, WorkerState, Account, IdentityToken, Session }
}
