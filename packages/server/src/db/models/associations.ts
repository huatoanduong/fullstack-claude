import { User } from './User'
import { Campaign } from './Campaign'
import { Recipient } from './Recipient'
import { CampaignRecipient } from './CampaignRecipient'
import { RefreshToken } from './RefreshToken'

User.hasMany(Campaign, { foreignKey: 'created_by', as: 'campaigns' })
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' })
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' })
Campaign.belongsTo(User, { foreignKey: 'created_by', as: 'creator' })

Campaign.hasMany(CampaignRecipient, { foreignKey: 'campaign_id', as: 'campaignRecipients' })
CampaignRecipient.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' })

Campaign.belongsToMany(Recipient, {
  through: CampaignRecipient,
  foreignKey: 'campaign_id',
  otherKey: 'recipient_id',
  as: 'recipients',
})
Recipient.belongsToMany(Campaign, {
  through: CampaignRecipient,
  foreignKey: 'recipient_id',
  otherKey: 'campaign_id',
  as: 'campaigns',
})
