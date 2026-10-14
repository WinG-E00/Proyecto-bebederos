import { defineNotification } from './Notification.model.js'
import { defineTaskEvent } from './TaskEvent.model.js'
import { defineTask } from './Task.model.js'
import { defineAssignment } from './Assignment.model.js'
import { defineInvitationFarm } from './InvitationFarm.model.js'
import { defineInvitation } from './Invitation.model.js'
import { defineEstimatedVisit } from './EstimatedVisit.model.js'
import { defineAnimalState } from './AnimalState.model.js'
import { defineAnimalPosition } from './AnimalPosition.model.js'
import { defineAnimal } from './Animal.model.js'
import { defineTroughPosition } from './TroughPosition.model.js'
import { defineWaterReading } from './WaterReading.model.js'
import { defineTroughState } from './TroughState.model.js'
import { defineTrough } from './Trough.model.js'
import { defineFarm } from './Farm.model.js'
import { defineAccount } from './Account.model.js'
import { defineHistoryEvent } from './HistoryEvent.model.js'
import { defineIdentityToken } from './IdentityToken.model.js'
import { defineMailOutbox } from './MailOutbox.model.js'
import { defineWorkerState } from './WorkerState.model.js'
import { defineSession } from '../services/session.service.js'

export function registerModels(db) {
  // Modelos de historias implementadas sobre migraciones explícitas; legacy excluido.
  const HistoryEvent = db.models.HistoryEvent ?? defineHistoryEvent(db)
  const MailOutbox = db.models.MailOutbox ?? defineMailOutbox(db)
  const WorkerState = db.models.WorkerState ?? defineWorkerState(db)
  const Account = db.models.Account ?? defineAccount(db)
  const IdentityToken = db.models.IdentityToken ?? defineIdentityToken(db)
  const Session = db.models.Session ?? defineSession(db)
  const Farm = db.models.Farm ?? defineFarm(db)
  const Trough = db.models.Trough ?? defineTrough(db)
  const TroughState = db.models.TroughState ?? defineTroughState(db)
  const WaterReading = db.models.WaterReading ?? defineWaterReading(db)
  const TroughPosition = db.models.TroughPosition ?? defineTroughPosition(db)
  const Animal = db.models.Animal ?? defineAnimal(db)
  const AnimalPosition = db.models.AnimalPosition ?? defineAnimalPosition(db)
  const AnimalState = db.models.AnimalState ?? defineAnimalState(db)
  const EstimatedVisit = db.models.EstimatedVisit ?? defineEstimatedVisit(db)
  const Invitation = db.models.Invitation ?? defineInvitation(db)
  const InvitationFarm = db.models.InvitationFarm ?? defineInvitationFarm(db)
  const Assignment = db.models.Assignment ?? defineAssignment(db)
  const Task = db.models.Task ?? defineTask(db)
  const TaskEvent = db.models.TaskEvent ?? defineTaskEvent(db)
  const Notification = db.models.Notification ?? defineNotification(db)
  return {
    Notification,
    TaskEvent,
    Task,
    Assignment,
    InvitationFarm,
    Invitation,
    Animal,
    EstimatedVisit,
    AnimalState,
    AnimalPosition,
    TroughPosition,
    WaterReading,
    TroughState,
    Trough,
    Farm,
    HistoryEvent,
    MailOutbox,
    WorkerState,
    Account,
    IdentityToken,
    Session,
  }
}
