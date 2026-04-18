import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize'
import { sequelize } from '../index'

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent'

export class Campaign extends Model<
  InferAttributes<Campaign>,
  InferCreationAttributes<Campaign>
> {
  declare id: CreationOptional<string>
  declare name: string
  declare subject: string
  declare body: string
  declare status: CreationOptional<CampaignStatus>
  declare scheduled_at: Date | null
  declare created_by: string
  declare created_at: CreationOptional<Date>
  declare updated_at: CreationOptional<Date>

  isDraft() {
    return this.status === 'draft'
  }

  canEdit() {
    return this.status === 'draft'
  }
}

Campaign.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent'),
      defaultValue: 'draft',
    },
    scheduled_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'campaigns',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
)
