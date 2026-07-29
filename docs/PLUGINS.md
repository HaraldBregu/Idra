# Friday plugins

Friday discovers user-installed plugins from:

```text
<Electron userData>/plugins/<plugin-id>/manifest.json
```

The installed application directory is not used because packaged application files may be read-only
or replaced by an update. Plugin IDs and contribution IDs use lowercase kebab-case. The plugin folder
name must match the manifest `id`.

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
		"widgets": [
			{
				"id": "dashboard",
				"title": "Acme Dashboard",
				"description": "Account usage and status.",
				"category": "integration",
				"entry": "widgets/dashboard/index.html"
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

The main-process `PluginRepository` is the filesystem source of truth. It validates manifests, returns
structured scan issues, rejects provider ID collisions, and supplies provider and widget contributions
to their existing IPC and menu flows.
