# Remote MCP Server Connector

Catalog notes for Friday's remote MCP connector.

| Field | Value |
| --- | --- |
| Connector id | `connector_remote_mcp` |
| Direct connector id | `custom_rest_openapi` |
| Name | Remote MCP Server |

## Setup

Use the MCP client guide at https://modelcontextprotocol.io/docs/develop/build-client.

Environment variables:

- `REMOTE_MCP_API_KEY`

Tools are discovered from the connected MCP server at runtime. The catalog starts empty because the server owns the actual tool list.

Use with `discovered_tool`.

Scopes:

None.
