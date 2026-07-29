# Friday plugins

Friday discovers user-installed plugins from:

```text
<Electron userData>/plugins/<plugin-id>/manifest.json
```

The installed application directory is not used because packaged application files may be read-only
or replaced by an update. Plugin IDs and contribution IDs use lowercase kebab-case. The plugin folder
name must match the manifest `id`.

A plugin keeps each contribution kind in its own folder:

```text
<plugin-id>/
  manifest.json
  providers/
  skills/<skill-id>/SKILL.md
  widgets/<widget-id>/index.html
  mcp/
  languages/<locale>.json
  themes/<theme-id>.json
  channels/<channel-id>.mjs
```

## Manifest version 1

```json
{
	"schemaVersion": 1,
	"id": "acme-tools",
	"name": "Acme Tools",
	"version": "1.0.0",
	"description": "Acme provider and dashboard integrations.",
	"contributes": {
		"providers": [
			{
				"id": "acme",
				"name": "Acme AI",
				"protocol": "openai-compatible",
				"baseUrl": "https://api.acme.test/v1",
				"models": [{ "id": "acme-chat", "name": "Acme Chat" }],
				"apiKeyUrl": "https://acme.test/keys"
			}
		],
		"skills": [{ "id": "summarizer", "path": "skills/summarizer" }],
		"mcpServers": [
			{
				"id": "acme-docs",
				"name": "Acme Docs",
				"type": "http",
				"url": "https://mcp.acme.test"
			}
		],
		"widgets": [
			{
				"id": "dashboard",
				"title": "Acme Dashboard",
				"description": "Account usage and status.",
				"category": "integration",
				"entry": "widgets/dashboard/index.html"
			}
		],
		"languages": [{ "id": "fr", "name": "Français", "entry": "languages/fr.json" }],
		"themes": [{ "id": "ocean", "name": "Ocean", "entry": "themes/ocean.json" }],
		"channels": [
			{
				"id": "helpdesk",
				"name": "Helpdesk",
				"description": "Acme support chat.",
				"entry": "channels/helpdesk.mjs"
			}
		]
	}
}
```

Provider credentials do not belong in the manifest. They remain in Friday's provider settings store.
Version 1 supports declarative OpenAI-compatible chat providers; custom executable provider adapters
are not loaded into the Electron main process.

Widget entries must be relative HTML paths inside the plugin folder. Friday verifies that each entry is
a regular file and remains inside its plugin before exposing it. Plugin widgets run without Friday's
preload API.

Skills must contain `SKILL.md`. Language and theme contributions are JSON assets. MCP server
contributions contain connection metadata but no credentials. Channel entries are cataloged as
contained JavaScript modules but are not executed by this foundation; channel activation will require
an explicit trust decision and lifecycle integration with Friday's channel registry.

The main-process `PluginRepository` is the filesystem source of truth. It validates manifests, returns
structured scan issues, rejects provider ID collisions, and catalogs providers, skills, widgets, MCP
servers, languages, themes, and chatbot communication channels. Provider and widget contributions are
already supplied to their existing IPC and menu flows; the other catalogs are ready for their
respective runtime registries.
