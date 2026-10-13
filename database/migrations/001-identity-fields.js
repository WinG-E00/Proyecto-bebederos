import { createTables, immutableRecords } from './schema.js'

export const tables = [
  [
    "Accounts",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "name VARCHAR(255) NOT NULL",
      "email VARCHAR(254) COLLATE utf8mb4_0900_as_ci NOT NULL UNIQUE",
      "passwordHash VARCHAR(255) NOT NULL",
      "role ENUM('owner','worker') NOT NULL",
      "emailVerifiedAt DATETIME(3) NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "UNIQUE KEY account_role (id, role)",
      "CHECK (CHAR_LENGTH(TRIM(name)) > 0)",
      "CHECK (email = LOWER(TRIM(email)) COLLATE utf8mb4_0900_as_cs)"
    ]
  ],
  [
    "Farms",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "ownerId INT UNSIGNED NOT NULL",
      "ownerRole ENUM('owner','worker') NOT NULL DEFAULT 'owner'",
      "name VARCHAR(255) NOT NULL",
      "latitude DOUBLE NOT NULL",
      "longitude DOUBLE NOT NULL",
      "areaHa DOUBLE NOT NULL",
      "description TEXT NOT NULL",
      "staleMinutes INT UNSIGNED NOT NULL DEFAULT 180",
      "timezone VARCHAR(64) NOT NULL",
      "deletedAt DATETIME(3) NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "UNIQUE KEY farm_owner (ownerId,id)",
      "FOREIGN KEY (ownerId,ownerRole) REFERENCES Accounts (id,role) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "CHECK (ownerRole = 'owner')",
      "CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
      "CHECK (areaHa >= 0 AND staleMinutes > 0)",
      "CHECK (CHAR_LENGTH(TRIM(name)) > 0 AND CHAR_LENGTH(TRIM(timezone)) > 0)",
      "KEY farms_scope (ownerId,deletedAt)"
    ]
  ],
  [
    "Assignments",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "farmId INT UNSIGNED NOT NULL",
      "workerId INT UNSIGNED NOT NULL",
      "workerRole ENUM('owner','worker') NOT NULL DEFAULT 'worker'",
      "active BOOLEAN NOT NULL DEFAULT TRUE",
      "revokedAt DATETIME(3) NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "UNIQUE KEY farm_worker (farmId,workerId)",
      "FOREIGN KEY (farmId) REFERENCES Farms (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (workerId,workerRole) REFERENCES Accounts (id,role) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "CHECK (workerRole = 'worker')",
      "KEY assignments_access (workerId,active,farmId)"
    ]
  ],
  [
    "Invitations",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "ownerId INT UNSIGNED NOT NULL",
      "ownerRole ENUM('owner','worker') NOT NULL DEFAULT 'owner'",
      "email VARCHAR(254) COLLATE utf8mb4_0900_as_ci NOT NULL",
      "tokenHash CHAR(64) COLLATE utf8mb4_bin NOT NULL UNIQUE",
      "issuedAt DATETIME(3) NOT NULL",
      "expiresAt DATETIME(3) NOT NULL",
      "state ENUM('Pendiente','Aceptada','Retirada','Vencida') NOT NULL DEFAULT 'Pendiente'",
      "deliveryState ENUM('Pendiente','Enviado','Fallido') NOT NULL DEFAULT 'Pendiente'",
      "acceptedById INT UNSIGNED NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "UNIQUE KEY invitation_owner (ownerId,id)",
      "FOREIGN KEY (ownerId,ownerRole) REFERENCES Accounts (id,role) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (acceptedById) REFERENCES Accounts (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "CHECK (ownerRole = 'owner')",
      "CHECK (expiresAt = DATE_ADD(issuedAt, INTERVAL 7 DAY))",
      "KEY invitations_owner_state (ownerId,state)"
    ]
  ],
  [
    "InvitationFarms",
    [
      "invitationId INT UNSIGNED NOT NULL",
      "farmId INT UNSIGNED NOT NULL",
      "ownerId INT UNSIGNED NOT NULL",
      "active BOOLEAN NOT NULL DEFAULT TRUE",
      "PRIMARY KEY (invitationId,farmId)",
      "FOREIGN KEY (ownerId,invitationId) REFERENCES Invitations (ownerId,id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (ownerId,farmId) REFERENCES Farms (ownerId,id) ON DELETE RESTRICT ON UPDATE RESTRICT"
    ]
  ],
  [
    "IdentityTokens",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "accountId INT UNSIGNED NOT NULL",
      "type ENUM('verification','recovery') NOT NULL",
      "tokenHash CHAR(64) COLLATE utf8mb4_bin NOT NULL UNIQUE",
      "expiresAt DATETIME(3) NOT NULL",
      "consumedAt DATETIME(3) NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "FOREIGN KEY (accountId) REFERENCES Accounts (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "KEY tokens_expiration (accountId,type,expiresAt)"
    ]
  ],
  [
    "Sessions",
    [
      "sid VARCHAR(36) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY",
      "data TEXT NOT NULL",
      "expires DATETIME(3) NOT NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "KEY sessions_expiration (expires)"
    ]
  ]
]

export async function up({ context }) {
  await createTables(context, tables)
}
export async function down() { throw new Error('Migración irreversible: conservar hechos y usar una nueva migración explícita') }
