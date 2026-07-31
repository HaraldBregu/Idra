# Friday plugins

Friday discovers user-installed plugins from:

```text
<Electron userData>/plugins/<plugin-id>/manifest.json
```

Install a published or local plugin with the Friday CLI:

```sh
friday install package-one
friday install ./path/to/plugin
```

Use `friday tui` for the interactive terminal interface, then enter `/install package-one`.
The CLI fetches npm packages without running lifecycle scripts, validates their manifest and
contributed files, and installs them atomically. Restart Friday after installation.

The installed application directory is not used because packaged application files may be read-only
or replaced by an update. Plugin IDs and contribution IDs use lowercase kebab-case. The plugin folder
name must match the manifest `id`.

A plugin keeps each contribution kind in its own folder. The `extensions/`, `skills/`, and
`providers/` folders are the standardized layout: extension entries must live under `extensions/`,
skill paths under `skills/`, and each provider is a folder under `providers/` shaped like the
built-in `resources/providers/<id>/` catalog:

```text
<plugin-id>/
  manifest.json
  extensions/<extension-id>/index.html
  skills/<skill-id>/SKILL.md
  providers/<provider-id>/
    info.json
    models.json
  mcp/
  languages/<locale>.json
  themes/<theme-id>.json
  channels/<channel-id>.mjs
```

## Manifest version 3

```json
{
	"schemaVersion": 3,
	"id": "acme-tools",
	"name": "Acme Tools",
	"version": "1.0.0",
	"description": "Acme provider and dashboard integrations.",
	"contributes": {
		"providers": [{ "id": "acme" }],
		"skills": [{ "id": "summarizer", "path": "skills/summarizer" }],
		"mcpServers": [
			{
				"id": "acme-docs",
				"name": "Acme Docs",
				"type": "http",
				"url": "https://mcp.acme.test"
			}
		],
		"extensions": [
			{
				"id": "dashboard",
				"title": "Acme Dashboard",
				"description": "Account usage and status.",
				"category": "integration",
				"entry": "extensions/dashboard/index.html"
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

A provider contribution only declares its `id`; the definition lives in `providers/<provider-id>/`:

```json
// providers/acme/info.json
{
	"name": "Acme AI",
	"protocol": "openai-compatible",
	"baseUrl": "https://api.acme.test/v1",
	"apiKeyUrl": "https://acme.test/keys"
}
```

```json
// providers/acme/models.json
[{ "id": "acme-chat", "name": "Acme Chat" }]
```

Provider credentials do not belong in the manifest. They remain in Friday's provider settings store.
Only declarative OpenAI-compatible chat providers are supported; custom executable provider adapters
are not loaded into the Electron main process.

Extension entries must be relative HTML paths inside the plugin folder. Friday verifies that each entry is
a regular file and remains inside its plugin before exposing it. Plugin extensions run without Friday's
preload API.

Skills must contain `SKILL.md`. Language and theme contributions are JSON assets. MCP server
contributions contain connection metadata but no credentials. Channel entries are cataloged as
contained JavaScript modules but are not executed by this foundation; channel activation will require
an explicit trust decision and lifecycle integration with Friday's channel registry.

The main-process `PluginRepository` is the filesystem source of truth. It validates manifests, returns
structured scan issues, rejects provider ID collisions, and catalogs providers, skills, extensions, MCP
servers, languages, themes, and chatbot communication channels. Provider and extension contributions are
already supplied to their existing IPC and menu flows; the other catalogs are ready for their
respective runtime registries.
