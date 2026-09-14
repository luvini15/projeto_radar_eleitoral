import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


def payload(result):
    if result.structuredContent:
        return result.structuredContent
    text_block = next(block.text for block in result.content if hasattr(block, "text"))
    return json.loads(text_block)


async def main():
    script = Path(__file__).resolve().parents[1] / "radar_mcp.py"
    params = StdioServerParameters(
        command=sys.executable,
        args=[str(script)],
        env={**os.environ, "RADAR_API_URL": "http://127.0.0.1:8001"},
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            assert len(tools.tools) == 6
            assert all(tool.annotations.readOnlyHint for tool in tools.tools)

            campaigns = await session.call_tool("radar_list_campaigns", {})
            assert not campaigns.isError
            overview = await session.call_tool("radar_get_overview", {"campaign_id": 1})
            assert not overview.isError
            post = await session.call_tool(
                "radar_get_post", {"campaign_id": 1, "post_id": 2, "days": 7}
            )
            assert not post.isError
            data = payload(post)
            assert data["post"]["post_id"] == 2
            assert len(data["history"]) == 2
            assert len(data["comments"]["texts"]) == 2

            wrong = await session.call_tool(
                "radar_get_post", {"campaign_id": 2, "post_id": 2}
            )
            assert wrong.isError
            print(
                "OK: handshake MCP, 6 ferramentas de leitura, dados da fixture, "
                "filtro semanal e isolamento por campanha."
            )


asyncio.run(main())
