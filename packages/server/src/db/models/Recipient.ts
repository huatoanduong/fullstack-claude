import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from 'sequelize'
import { sequelize } from '../index'

export class Recipient extends Model<
  InferAttributes<Recipient>,
  InferCreationAttributes<Recipient>
> {
  declare id: CreationOptional<string>
  declare email: string
  declare name: string | null
  declare created_by: string | null
  declare created_at: CreationOptional<Date>
}

Recipient.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'recipients',
    timestamps: false,
  }
)
