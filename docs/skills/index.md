# Skills

Skills are local reusable capabilities that teach Friday how to approach a class of work. They can provide instructions, resources, schemas, and optional execution behavior without requiring each agent turn to rediscover the same workflow.

## Functionality

- Registers built-in example skills and user-installed skills.
- Imports or downloads skills into the user-data skill root.
- Parses skill manifests and resource metadata.
- Discovers relevant skills for a user request.
- Adds selected skill guidance to agent context.
- Executes skills through a controlled tool path when a skill provides executable behavior.

## Skill Shape

A skill is described by a manifest with fields such as name, description, version, tags, supported tools, required connectors, input schema, output schema, and safety metadata. Skill resources can include scripts, references, templates, and assets. Resource loading is bounded so a skill cannot silently add unlimited context.

Skills can be enabled or disabled. Disabled skills remain installed but are not selected for new turns.

## Discovery And Selection

Before an agent turn, the agent service builds the available tool set and asks the skill service for matching skills. Discovery ranks enabled skills by their description, declared triggers, user preferences, tool availability, connector availability, and safety checks.

Selected skills are summarized into the agent prompt. Skills that need local files or resources are only selected when the required tool access is available.

## Execution

Executable skills run through a dedicated skill execution path. The service validates input against the skill schema, limits available tools and connectors to the declared scope, applies timeouts and retry rules, records provenance, and validates output when an output schema is declared.

Skill execution can use scoped memory, connector access, and tool calls when the skill declares and passes the required checks.

## Safety

The skill service blocks disabled skills, excessive recursion, excessive depth, missing tools, missing connectors, and unsafe prompt-injection patterns. It audits discovery and execution decisions so the app can explain why a skill was selected or rejected.

Provider-specific support metadata can exist for packaging and routing, but the main runtime path is local discovery, prompt inclusion, and controlled execution.
