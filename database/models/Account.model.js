import { DataTypes } from 'sequelize'

// Correo normalizado: sin espacios externos y en minúsculas (data-model.md, convenciones).
export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value
}

// "Rol obligatorio `owner` o `worker`, nunca ambos. Correo único."
// "Perfil editable no cambia rol/correo en el MVP."
export function defineAccount(db) {
  const frozen = (account) => {
    if (account.changed('role') || account.changed('email')) throw new Error('Rol y correo no son editables')
  }
  return db.define('Account', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('owner', 'worker'), allowNull: false },
    emailVerifiedAt: { type: DataTypes.DATE(3), allowNull: true },
  }, {
    tableName: 'Accounts', timestamps: true,
    hooks: {
      beforeValidate(account) {
        if (account.email) account.email = normalizeEmail(account.email)
        if (typeof account.name === 'string') account.name = account.name.trim()
      },
      beforeUpdate: frozen,
      beforeBulkUpdate({ fields }) {
        if (fields?.includes('role') || fields?.includes('email')) throw new Error('Rol y correo no son editables')
      },
    },
  })
}

// Única representación pública de una cuenta: nunca incluye el hash ni fechas internas.
export function serializeAccount(account) {
  return { id: Number(account.id), name: account.name, email: account.email, role: account.role }
}
