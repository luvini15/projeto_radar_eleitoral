import type {
  InstagramDataProvider,
} from '@/services/instagramService'

/**
 * Implementação futura de `InstagramDataProvider` usando a API oficial
 * do Instagram (Meta Graph API / Instagram Business Login).
 *
 * Ainda não implementada neste protótipo. Quando a autorização do
 * aplicativo da Meta for concluída, cada método deve:
 *   1. Buscar o token de acesso salvo (nunca hardcoded no frontend);
 *   2. Chamar o endpoint correspondente da Graph API;
 *   3. Mapear a resposta para os tipos definidos em `src/types/instagram.ts`.
 *
 * Basta substituir a instância exportada em `instagramService.ts` por
 * `new MetaInstagramService()` para ativar dados reais — nenhum
 * componente de página ou visualização precisa mudar.
 *
 * Escopo do MVP alinhado à Meta API:
 * - métricas da própria conta autorizada;
 * - métricas de mídia/publicações conforme formato e permissões;
 * - comentários das mídias autorizadas, quando implementado;
 * - audiência agregada quando disponível e elegível;
 * - crescimento de seguidores calculado por snapshots salvos no banco.
 *
 * Fora do MVP oficial: dados privados de concorrentes, lista individual de seguidores/unfollows, previsão eleitoral e mapa detalhado por RA.
 */
export class MetaInstagramService implements InstagramDataProvider {
  getAccountSummary(): ReturnType<InstagramDataProvider['getAccountSummary']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
  getDailyMetrics(): ReturnType<InstagramDataProvider['getDailyMetrics']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
  getMedia(): ReturnType<InstagramDataProvider['getMedia']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
  getMediaInsights(): ReturnType<InstagramDataProvider['getMediaInsights']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
  getTopics(): ReturnType<InstagramDataProvider['getTopics']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
  getFormats(): ReturnType<InstagramDataProvider['getFormats']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
  getHeatmap(): ReturnType<InstagramDataProvider['getHeatmap']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
  getAudience(): ReturnType<InstagramDataProvider['getAudience']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
  getStrategicInsights(): ReturnType<InstagramDataProvider['getStrategicInsights']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
  getAlerts(): ReturnType<InstagramDataProvider['getAlerts']> {
    throw new Error('MetaInstagramService ainda não implementado — aguardando autorização do app da Meta.')
  }
}
