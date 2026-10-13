import { createTables, immutableRecords } from './schema.js'

export const tables = [
  [
    "Troughs",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "farmId INT UNSIGNED NOT NULL",
      "name VARCHAR(255) NOT NULL",
      "latitude DOUBLE NULL",
      "longitude DOUBLE NULL",
      "locationSource ENUM('administrative','device') NOT NULL DEFAULT 'administrative'",
      "capacityLiters DOUBLE NOT NULL",
      "operationalState ENUM('Operativo','En mantenimiento','Fuera de servicio') NOT NULL DEFAULT 'Operativo'",
      "deletedAt DATETIME(3) NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "FOREIGN KEY (farmId) REFERENCES Farms (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "UNIQUE KEY trough_farm (farmId,id)",
      "CHECK (capacityLiters > 0)",
      "CHECK (CHAR_LENGTH(TRIM(name)) > 0)",
      "CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))",
      "KEY trough_scope (farmId,deletedAt)"
    ]
  ],
  [
    "Animals",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "farmId INT UNSIGNED NOT NULL",
      "name VARCHAR(255) NOT NULL",
      "species VARCHAR(100) NOT NULL",
      "breed VARCHAR(100) NOT NULL",
      "ageYears DOUBLE NOT NULL",
      "state VARCHAR(100) NOT NULL",
      "deletedAt DATETIME(3) NULL",
      "createdAt DATETIME(3) NOT NULL, updatedAt DATETIME(3) NOT NULL",
      "FOREIGN KEY (farmId) REFERENCES Farms (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "UNIQUE KEY animal_farm (farmId,id)",
      "CHECK (ageYears >= 0)",
      "CHECK (CHAR_LENGTH(TRIM(name)) > 0 AND CHAR_LENGTH(TRIM(species)) > 0 AND CHAR_LENGTH(TRIM(breed)) > 0 AND CHAR_LENGTH(TRIM(state)) > 0)",
      "KEY animals_scope (farmId,deletedAt)"
    ]
  ],
  [
    "WaterReadings",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "sourceKey VARCHAR(191) COLLATE utf8mb4_bin NOT NULL UNIQUE",
      "troughId INT UNSIGNED NOT NULL",
      "percentage DOUBLE NOT NULL",
      "measuredAt DATETIME(3) NOT NULL",
      "receivedAt DATETIME(3) NOT NULL",
      "processedAt DATETIME(3) NULL",
      "processingResult VARCHAR(50) NULL",
      "FOREIGN KEY (troughId) REFERENCES Troughs (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "CHECK (percentage BETWEEN 0 AND 100)",
      "UNIQUE KEY reading_trough (troughId,id)",
      "KEY readings_history (troughId,measuredAt,id)",
      "KEY readings_pending (processedAt,troughId,id)"
    ]
  ],
  [
    "AnimalPositions",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "sourceKey VARCHAR(191) COLLATE utf8mb4_bin NOT NULL UNIQUE",
      "animalId INT UNSIGNED NOT NULL",
      "latitude DOUBLE NOT NULL",
      "longitude DOUBLE NOT NULL",
      "measuredAt DATETIME(3) NOT NULL",
      "receivedAt DATETIME(3) NOT NULL",
      "processedAt DATETIME(3) NULL",
      "processingResult VARCHAR(50) NULL",
      "FOREIGN KEY (animalId) REFERENCES Animals (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
      "UNIQUE KEY position_animal (animalId,id)",
      "KEY animal_positions_history (animalId,measuredAt,id)",
      "KEY animal_positions_pending (processedAt,animalId,id)"
    ]
  ],
  [
    "TroughPositions",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "sourceKey VARCHAR(191) COLLATE utf8mb4_bin NOT NULL UNIQUE",
      "troughId INT UNSIGNED NOT NULL",
      "latitude DOUBLE NOT NULL",
      "longitude DOUBLE NOT NULL",
      "measuredAt DATETIME(3) NOT NULL",
      "receivedAt DATETIME(3) NOT NULL",
      "processedAt DATETIME(3) NULL",
      "processingResult VARCHAR(50) NULL",
      "FOREIGN KEY (troughId) REFERENCES Troughs (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)",
      "UNIQUE KEY position_trough (troughId,id)",
      "KEY trough_positions_history (troughId,measuredAt,id)",
      "KEY trough_positions_pending (processedAt,troughId,id)"
    ]
  ],
  [
    "AnimalStates",
    [
      "animalId INT UNSIGNED NOT NULL PRIMARY KEY",
      "lastPositionId INT UNSIGNED NULL",
      "troughInRangeId INT UNSIGNED NULL",
      "FOREIGN KEY (animalId) REFERENCES Animals (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (animalId,lastPositionId) REFERENCES AnimalPositions (animalId,id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (troughInRangeId) REFERENCES Troughs (id) ON DELETE RESTRICT ON UPDATE RESTRICT"
    ]
  ],
  [
    "TroughStates",
    [
      "troughId INT UNSIGNED NOT NULL PRIMARY KEY",
      "lastReadingId INT UNSIGNED NULL",
      "lastPositionId INT UNSIGNED NULL",
      "FOREIGN KEY (troughId) REFERENCES Troughs (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (troughId,lastReadingId) REFERENCES WaterReadings (troughId,id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (troughId,lastPositionId) REFERENCES TroughPositions (troughId,id) ON DELETE RESTRICT ON UPDATE RESTRICT"
    ]
  ],
  [
    "EstimatedVisits",
    [
      "id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY",
      "farmId INT UNSIGNED NOT NULL",
      "animalId INT UNSIGNED NOT NULL",
      "troughId INT UNSIGNED NOT NULL",
      "positionId INT UNSIGNED NOT NULL UNIQUE",
      "visitedAt DATETIME(3) NOT NULL",
      "FOREIGN KEY (farmId) REFERENCES Farms (id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (farmId,animalId) REFERENCES Animals (farmId,id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (farmId,troughId) REFERENCES Troughs (farmId,id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "FOREIGN KEY (animalId,positionId) REFERENCES AnimalPositions (animalId,id) ON DELETE RESTRICT ON UPDATE RESTRICT",
      "KEY visits_history (farmId,visitedAt,id)"
    ]
  ]
]

export async function up({ context }) {
  await createTables(context, tables)
  await immutableRecords(context, 'WaterReadings', ['sourceKey', 'troughId', 'percentage', 'measuredAt', 'receivedAt'])
  await immutableRecords(context, 'AnimalPositions', ['sourceKey', 'animalId', 'latitude', 'longitude', 'measuredAt', 'receivedAt'])
  await immutableRecords(context, 'TroughPositions', ['sourceKey', 'troughId', 'latitude', 'longitude', 'measuredAt', 'receivedAt'])
  await immutableRecords(context, 'EstimatedVisits', null)
}
export async function down() { throw new Error('Migración irreversible: conservar hechos y usar una nueva migración explícita') }
