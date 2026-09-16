import type { ReactNode } from 'react'
import { DataFrame } from './ApiData'
import { useCampaign } from '@/lib/campaignContext'

export function CampaignPage({ children }: { children: ReactNode }) {
  const campaign = useCampaign()
  return <DataFrame data={Boolean(campaign.selected)} showContext={false}>{children}</DataFrame>
}
