// DDL MySQL explícito. IF NOT EXISTS permite retomar una interrupción del mismo
// archivo, dado que MySQL confirma DDL de forma implícita. No se borra ni altera.
export async function createTables(db, tables) {
  for (const [name, columns] of tables) {
    await db.query(`CREATE TABLE IF NOT EXISTS \`${name}\` (${columns.join(',\n')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`)
  }
}
export async function immutableRecords(db, table, fields = null) {
  for (const operation of ['UPDATE', 'DELETE']) {
    const name = `immutable_${table}_${operation.toLowerCase()}`
    const [existing] = await db.query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = :name', { replacements: { name } })
    if (existing.length) continue
    const guard = operation === 'UPDATE' && fields
      ? `IF ${['id', ...fields].map((field) => `NOT (NEW.\`${field}\` <=> OLD.\`${field}\`)`).join(' OR ')} THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable measurement'; END IF;`
      : "SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Immutable historical record';"
    await db.query(`CREATE TRIGGER \`${name}\` BEFORE ${operation} ON \`${table}\` FOR EACH ROW BEGIN ${guard} END`)
  }
}
