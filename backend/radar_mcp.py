"""Read-only Radar MCP. Start from repository root; requires backend running."""
import os
from typing import Annotated
import httpx
from pydantic import Field
from mcp.server.fastmcp import FastMCP

mcp = FastMCP('radar_mcp')
READ_ONLY = {'readOnlyHint': True, 'destructiveHint': False, 'idempotentHint': True, 'openWorldHint': False}
PositiveID = Annotated[int, Field(ge=1, description='ID numérico retornado pelas ferramentas de listagem')]

async def get(path: str, params=None):
    base = os.getenv('RADAR_API_URL', 'http://127.0.0.1:8000').rstrip('/')
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f'{base}/api{path}', params=params)
        if response.status_code == 404:
            raise ValueError('Registro não encontrado nesta campanha. Consulte radar_list_campaigns e radar_list_posts.')
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError:
        raise ValueError('Não foi possível consultar o Radar. Verifique se o backend está rodando e RADAR_API_URL está correto.') from None

@mcp.tool(annotations=READ_ONLY)
async def radar_list_campaigns(offset: Annotated[int, Field(ge=0)] = 0, limit: Annotated[int, Field(ge=1, le=50)] = 20) -> dict:
    """Lista campanhas cadastradas. Retorna IDs, nomes, total e próxima página; nunca cria registros."""
    items = await get('/campaigns')
    return {'items': items[offset:offset+limit], 'total': len(items), 'next_offset': offset+limit if offset+limit < len(items) else None}

@mcp.tool(annotations=READ_ONLY)
async def radar_get_campaign(campaign_id: PositiveID) -> dict:
    """Consulta campanha e seus perfis com papéis CLIENT/COMPETITOR. Use para selecionar o perfil correto."""
    return await get(f'/campaigns/{campaign_id}')

@mcp.tool(annotations=READ_ONLY)
async def radar_get_overview(campaign_id: PositiveID, posts_per_profile: Annotated[int, Field(ge=1, le=100)] = 25) -> dict:
    """Retorna métricas observadas da campanha, por perfil. Null significa indisponível, interações podem ser parciais."""
    return await get(f'/campaigns/{campaign_id}/overview', {'limit': posts_per_profile})

@mcp.tool(annotations=READ_ONLY)
async def radar_list_posts(campaign_id: PositiveID, offset: Annotated[int, Field(ge=0)] = 0, limit: Annotated[int, Field(ge=1, le=50)] = 20) -> dict:
    """Lista a amostra dos 100 posts mais recentes por perfil, paginada. Retorna dados reais e post_id para detalhamento."""
    data = await get(f'/campaigns/{campaign_id}/posts', {'limit_per_profile': 100})
    items = data['posts']
    return {'items': items[offset:offset+limit], 'total_in_sample': len(items), 'posts_per_profile': 100, 'next_offset': offset+limit if offset+limit < len(items) else None}

@mcp.tool(annotations=READ_ONLY)
async def radar_get_post(campaign_id: PositiveID, post_id: PositiveID, days: Annotated[int, Field(ge=1, le=365)] = 30) -> dict:
    """Detalha um post, métricas, amostra textual de comentários e até 100 coletas recentes no período. Não representa todos os comentários."""
    data = await get(f'/campaigns/{campaign_id}/posts/{post_id}', {'days': days})
    data['history_truncated'] = len(data['history']) > 100
    data['history'] = data['history'][:100]
    return data

@mcp.tool(annotations=READ_ONLY)
async def radar_get_followers(campaign_id: PositiveID, days: Annotated[int, Field(ge=1, le=365)] = 30) -> dict:
    """Retorna histórico de seguidores por perfil no período; sem inferências sobre crenças ou características pessoais."""
    return await get(f'/campaigns/{campaign_id}/followers-history', {'days': days})

if __name__ == '__main__':
    mcp.run(transport='stdio')
