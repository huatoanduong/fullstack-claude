import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from 'sequelize'
import { sequelize } from '../index'

export type CRStatus = 'pending' | 'sent' | 'failed'

export class CampaignRecipient extends Model<
  InferAttributes<CampaignRecipient>,
  InferCreationAttributes<CampaignRecipient>
> {
  declare campaign_id: string
  declare recipient_id: string
  declare status: CreationOptional<CRStatus>
  declare sent_at: Date | null
  declare opened_at: Date | null
}

CampaignRecipient.init(
  {
    campaign_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    recipient_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending',
    },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    opened_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'campaign_recipients',
    timestamps: false,
  }
)
