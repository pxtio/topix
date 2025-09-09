"""MCP servers manager and configuration."""

import logging

from typing import List, Optional

from agents.mcp import MCPServerStdio, create_static_tool_filter

logger = logging.getLogger(__name__)


class MCPServersManager:
    """Advanced MCP agent manager with tool filtering.

    Error handling and flexible configuration.
    """

    def __init__(self):
        """Initialize the MCP servers manager."""
        self.mcp_servers = []

    def add_stdio_server(
        self,
        name: str,
        command: str,
        args: List[str],
        working_dir: Optional[str] = None,
        cache_tools_list: bool = True,
        allowed_tools: Optional[List[str]] = None,
        blocked_tools: Optional[List[str]] = None
    ) -> MCPServerStdio:
        """Add a local MCP server with tool filtering."""
        # Create tool filter if specified
        tool_filter = None
        if allowed_tools or blocked_tools:
            tool_filter = create_static_tool_filter(
                allowed_tool_names=allowed_tools,
                blocked_tool_names=blocked_tools
            )

        server = MCPServerStdio(
            name=name,
            params={
                "command": command,
                "args": args,
                "working_dir": working_dir
            },
            cache_tools_list=cache_tools_list,
            tool_filter=tool_filter
        )

        self.mcp_servers.append(server)
        logger.info(f"MCP stdio server added: {name}")
        return server

    async def init_servers(self):
        """Connect all configured MCP servers."""
        for server in self.mcp_servers:
            await server.connect()

    def create_python_executor_mcp_server(self) -> MCPServerStdio:
        """Create and add the 'Python Executor MCP' server using deno and mcp-run-python.

        Args:
            None

        Returns:
            MCPServerStdio: The python MCP server instance.

        Example:
        ```python
        mcp_servers_manager = MCPServersManager()
        s = mcp_servers_manager.create_python_executor_mcp_server()
        await mcp_servers_manager.init_servers()
        agent = CodeInterpreter(
            backend=CodeInterpreterBackend.MCP,
            mcp_servers=mcp_servers_manager.mcp_servers
        )
        ```

        """
        python_executor_mcp_server = self.add_stdio_server(
            name="Python Executor MCP",
            command="deno",
            args=[
                "run",
                "--allow-net",
                "--allow-read=node_modules",
                "--allow-write=node_modules",
                "--node-modules-dir=auto",
                "jsr:@pydantic/mcp-run-python",
                "stdio"
            ],
            cache_tools_list=True
        )
        return python_executor_mcp_server
