import { QueryTypes } from 'sequelize'
export const sqlDate = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 23).replace('T', ' ') : value
export const sqlValues = (values) =>
  Object.fromEntries(Object.entries(values).map(([k, v]) => [k, sqlDate(v)]))
export const select = (db, sql, replacements = {}, transaction) =>
  db.query(sql, { replacements: sqlValues(replacements), type: QueryTypes.SELECT, transaction })
export async function update(db, table, id, values, transaction, key = 'id') {
  const keys = Object.keys(values)
  await db.query(
    `UPDATE \`${table}\` SET ${keys.map((k) => `\`${k}\`=:${k}`).join(',')} WHERE \`${key}\`=:rowId`,
    { replacements: sqlValues({ ...values, rowId: id }), transaction },
  )
}
export async function insert(db, table, values, transaction) {
  const keys = Object.keys(values)
  const [id] = await db.query(
    `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(',')}) VALUES (${keys.map((k) => `:${k}`).join(',')})`,
    { replacements: sqlValues(values), transaction },
  )
  return Number(id)
}
