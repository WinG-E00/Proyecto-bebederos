import { createTables, immutableRecords } from './schema.js'

export const tables = [
  [
    "Tasks",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "farmId INT UNSIGNED NOT NULL",
      "title VARCHAR(255) NOT NULL",
      "description TEXT NOT NULL",
      "priority ENUM('Baja','Media','Alta') NOT NULL DEFAULT 'Media'",
      "deadline DATETIME(3) NOT NULL",
      "state ENUM('Pendiente','En progreso','Pendiente de validación','Completada') NOT NULL DEFAULT 'Pendiente'",
      "workerId INT UNSIGNED NULL",
      "troughId INT UNSIGNED NULL",
      "version INT UNSIGNED NOT NULL DEFAULT 1",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "UNIQUE KEY task_farm (farmId,id)",
      "FOREIGN KEY (farmId) REFERENCES Farms (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (farmId,workerId) REFERENCES Assignments (farmId,workerId) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (farmId,troughId) REFERENCES Troughs (farmId,id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "CHECK (version > 0)",
      "CHECK (CHAR_LENGTH(TRIM(title)) > 0)",
      "KEY tasks_scope (farmId,workerId,state,deadline)"
    ]
  ],
  [
    "TaskEvents",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "taskId INT UNSIGNED NOT NULL",
      "farmId INT UNSIGNED NOT NULL",
      "actorId INT UNSIGNED NOT NULL",
      "occurredAt DATETIME(3) NOT NULL",
      "action VARCHAR(50) NOT NULL",
      "previousState VARCHAR(50) NULL",
      "newState VARCHAR(50) NOT NULL",
      "previousWorkerId INT UNSIGNED NULL",
      "newWorkerId INT UNSIGNED NULL",
      "comment TEXT NULL",
      "FOREIGN KEY (farmId,taskId) REFERENCES Tasks (farmId,id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (actorId) REFERENCES Accounts (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (previousWorkerId) REFERENCES Accounts (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (newWorkerId) REFERENCES Accounts (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "CHECK (action <> 'reject' OR (comment IS NOT NULL AND CHAR_LENGTH(TRIM(comment)) > 0))",
      "KEY task_events_history (farmId,occurredAt,id)"
    ]
  ],
  [
    "Alerts",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "farmId INT UNSIGNED NOT NULL",
      "resourceType ENUM('trough','animal') NOT NULL",
      "resourceId INT UNSIGNED NOT NULL",
      "conditionName VARCHAR(50) NOT NULL",
      "message TEXT NOT NULL",
      "generatedAt DATETIME(3) NOT NULL",
      "resolvedAt DATETIME(3) NULL",
      "activeKey VARCHAR(191) COLLATE utf8mb4_bin NULL UNIQUE",
      "FOREIGN KEY (farmId) REFERENCES Farms (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "KEY alerts_scope (farmId,resolvedAt,generatedAt)"
    ]
  ],
  [
    "Notifications",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "farmId INT UNSIGNED NOT NULL",
      "recipientId INT UNSIGNED NOT NULL",
      "taskId INT UNSIGNED NULL",
      "type VARCHAR(50) NOT NULL",
      "message TEXT NOT NULL",
      "occurredAt DATETIME(3) NOT NULL",
      "readAt DATETIME(3) NULL",
      "FOREIGN KEY (farmId) REFERENCES Farms (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (recipientId) REFERENCES Accounts (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (farmId,taskId) REFERENCES Tasks (farmId,id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "KEY notifications_scope (recipientId,farmId,readAt,occurredAt)"
    ]
  ],
  [
    "HistoryEvents",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "farmId INT UNSIGNED NOT NULL",
      "type ENUM('water','gps','visit','alert','task','retirement') NOT NULL",
      "resourceId INT UNSIGNED NOT NULL",
      "actorId INT UNSIGNED NULL",
      "occurredAt DATETIME(3) NOT NULL",
      "details JSON NOT NULL",
      "FOREIGN KEY (farmId) REFERENCES Farms (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (actorId) REFERENCES Accounts (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "KEY history_scope (farmId,type,occurredAt,id)"
    ]
  ],
  [
    "MailOutbox",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "invitationId INT UNSIGNED NULL",
      "identityTokenId INT UNSIGNED NULL",
      "kind ENUM('invitation','verification','recovery') NOT NULL",
      "recipient VARCHAR(254) NOT NULL",
      "subject VARCHAR(255) NOT NULL",
      "encryptedPayload MEDIUMTEXT NULL",
      "state ENUM('pending','sent','failed','expired') NOT NULL DEFAULT 'pending'",
      "attempts TINYINT UNSIGNED NOT NULL DEFAULT 0",
      "nextAttemptAt DATETIME(3) NOT NULL",
      "expiresAt DATETIME(3) NOT NULL",
      "sentAt DATETIME(3) NULL",
      "errorCode VARCHAR(50) NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "FOREIGN KEY (invitationId) REFERENCES Invitations (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (identityTokenId) REFERENCES IdentityTokens (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "CHECK (attempts <= 4)",
      "CHECK ((kind = 'invitation' AND invitationId IS NOT NULL AND identityTokenId IS NULL) OR (kind IN ('verification','recovery') AND identityTokenId IS NOT NULL AND invitationId IS NULL))",
      "KEY mail_pending (state,nextAttemptAt,id)"
    ]
  ],
  [
    "WeatherCaches",
    [
      "farmId INT UNSIGNED NOT NULL PRIMARY KEY",
      "queriedLocation JSON NOT NULL",
      "data JSON NOT NULL",
      "fetchedAt DATETIME(3) NOT NULL",
      "FOREIGN KEY (farmId) REFERENCES Farms (id) ON DELETE RESTRICT ON UPDATE RESTRICT"
    ]
  ],
  [
    "WorkerStates",
    [
      "name VARCHAR(100) NOT NULL PRIMARY KEY",
      "lastSuccessfulCycleAt DATETIME(3) NULL",
      "lastDurationMs INT UNSIGNED NULL",
      "errorCode VARCHAR(50) NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL"
    ]
  ]
]

export async function up({ context }) {
  await createTables(context, tables)
  await immutableRecords(context, 'TaskEvents')
  await immutableRecords(context, 'HistoryEvents')
}
export async function down() { throw new Error('Migración irreversible: conservar hechos y usar una nueva migración explícita') }
