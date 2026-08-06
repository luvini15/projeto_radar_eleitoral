import type {
  AccountSummary,
  DailyMetric,
  MediaItem,
  MediaInsight,
  TopicoResumo,
  StrategicInsight,
  FormatoResumo,
  HeatmapCelula,
  AudienceSummary,
  AlertaItem,
} from '@/types/instagram'

import { mockAccount } from '@/data/mockAccount'
import { mockDailyMetrics } from '@/data/mockDailyMetrics'
import { mockMedia } from '@/data/mockMedia'
import {
  mockTopicos,
  mockFormatos,
  mockHeatmap,
  mockAudience,
  mockStrategicInsights,
  mockAlertas,
  mockMediaInsights,
} from '@/data/mockInsights'

/**
 * Contrato único de acesso a dados do Instagram.
 *
 * Hoje é implementado por `MockInstagramService`, que retorna dados
 * fictícios fixos. No futuro, `MetaInstagramService` implementará a
 * mesma interface consumindo a API oficial (Graph API / Meta for
 * Developers), sem qualquer alteração nos componentes visuais.
 */
export interface InstagramDataProvider {
  getAccountSummary(): Promise<AccountSummary>
  getDailyMetrics(): Promise<DailyMetric[]>
  getMedia(): Promise<MediaItem[]>
  getMediaInsights(mediaId: string): Promise<MediaInsight | null>
  getTopics(): Promise<TopicoResumo[]>
  getFormats(): Promise<FormatoResumo[]>
  getHeatmap(): Promise<HeatmapCelula[]>
  getAudience(): Promise<AudienceSummary>
  getStrategicInsights(): Promise<StrategicInsight[]>
  getAlerts(): Promise<AlertaItem[]>
}

// Pequena latência artificial para simular chamadas assíncronas reais,
// sem travar a interface.
function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export class MockInstagramService implements InstagramDataProvider {
  async getAccountSummary(): Promise<AccountSummary> {
    return delay(mockAccount)
  }

  async getDailyMetrics(): Promise<DailyMetric[]> {
    return delay(mockDailyMetrics)
  }

  async getMedia(): Promise<MediaItem[]> {
    return delay(mockMedia)
  }

  async getMediaInsights(mediaId: string): Promise<MediaInsight | null> {
    return delay(mockMediaInsights[mediaId] ?? null)
  }

  async getTopics(): Promise<TopicoResumo[]> {
    return delay(mockTopicos)
  }

  async getFormats(): Promise<FormatoResumo[]> {
    return delay(mockFormatos)
  }

  async getHeatmap(): Promise<HeatmapCelula[]> {
    return delay(mockHeatmap)
  }

  async getAudience(): Promise<AudienceSummary> {
    return delay(mockAudience)
  }

  async getStrategicInsights(): Promise<StrategicInsight[]> {
    return delay(mockStrategicInsights)
  }

  async getAlerts(): Promise<AlertaItem[]> {
    return delay(mockAlertas)
  }
}

// Instância única usada pelas páginas. Trocar por `new MetaInstagramService()`
// quando a integração oficial estiver disponível — nenhum outro arquivo
// precisa ser alterado.
export const instagramService: InstagramDataProvider = new MockInstagramService()
