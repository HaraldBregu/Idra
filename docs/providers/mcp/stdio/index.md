# Local MCP Server Connector

Catalog notes for Friday's local stdio MCP connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_stdio_mcp` |
| Direct connector id | `custom_rest_openapi` |
| Name | Local MCP Server |

## Setup

Use the MCP client guide at https://modelcontextprotocol.io/docs/develop/build-client.

Environment variables:

Tools are discovered from the launched MCP server at runtime. Map any required server secrets from environment variables through the connector MCP config.

Use with `discovered_tool`.

Scopes:

None.
