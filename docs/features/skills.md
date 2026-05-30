# Skills

Skills are reusable local capabilities that teach Friday how to approach a class of work. They can add prompt guidance, references, templates, schemas, dependencies, and optional execution behavior.

## Functionality

- Registers built-in example skills and user-installed skills.
- Imports or downloads skills into the user-data skill root.
- Parses skill manifests and resource structure.
- Tracks skill diagnostics, version metadata, dependencies, categories, tags, visibility, and safety level.
- Discovers relevant enabled skills for an agent request.
- Ranks skills against the current prompt, available tools, required connectors, user preferences, and safety policy.
- Adds selected skill guidance to the agent prompt.
- Provides an execution tool when a selected skill needs controlled executable behavior.

## Runtime Behavior

Before an agent turn, the agent service builds the available tools and asks the skills service for matching skills. Selected skills are summarized into the prompt. If a skill needs execution, the runtime creates a scoped plan, restricts available tools/connectors, validates input/output schemas where declared, and records audit information.

The skill manifest supports fields such as:

- `name`, `description`, `version`, `author`, `license`
- `category`, `tags`, `visibility`, `safetyLevel`
- `requiredTools`, `allowedTools`, `requiredConnectors`
- `requiredMemoryKinds`
- `inputSchema`, `outputSchema`
- `dependencies`, `examples`, `metadata`

## Safety

The runtime blocks disabled skills, missing dependencies, missing tools, missing connectors, unsafe recursion, excessive depth, and unsafe prompt-injection patterns. Resource loading is bounded so a skill cannot silently add unlimited context.

## Source

- `src/main/skills`
- `src/shared/skills.ts`
- `src/main/service.ts`
- Existing docs: `docs/skills/index.md`, `docs/skills/runtime-integration-plan.md`

