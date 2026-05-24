# Plugins And Agent Harnesses

Plugins let Friday discover extension manifests and activate runtime surfaces for providers, channels, tools, hooks, setup flows, model metadata, and agent harnesses.

## Plugin Manifests

Plugin manifests are `friday.plugin.json` files. The loader normalizes fields such as:

- plugin id, name, description, kind, and enabled-by-default state
- providers and channels owned by the plugin
- provider and channel environment variables
- provider auth choices and command aliases
- skills, UI hints, config schema, setup entries, and runtime entries
- model support, model catalogs, pricing, endpoints, and request metadata
- tool, web, speech, realtime, memory, media, migration, and hook contracts

Discovery scans bundled, installed, and workspace roots, ignores build/cache directories, enforces a maximum scan depth, blocks unsafe path escapes, and rejects suspicious permissions or ownership where relevant.

## Activation

The activation planner can select plugins by provider, channel, command, route, tool, capability, or agent harness runtime. Plugin entries are loaded only when the trigger matches their manifest hints or owned surfaces.

## Agent Harnesses

Agent harness selection supports:

- the built-in `pi` harness
- plugin-registered harnesses
- forced runtime selection
- automatic plugin selection based on provider/model support
- fallback to the built-in harness when no plugin harness supports the run
- harness-specific compaction when the selected harness supports it

Configured non-default harness runtimes are activated during bootstrap and again before harness attempts.

## Source

- `src/main/plugins`
- `src/main/agent/harness`
- `src/main/agent/harness-runtimes.ts`
- `src/main/bootstrap.ts`
- Existing docs: `docs/agent-harness-implementation-plan.md`, `docs/agent-harness-implementation-progress.md`

