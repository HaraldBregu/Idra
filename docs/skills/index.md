# Skills

The skills module manages reusable agent capabilities. It can register built-in
and imported skills, discover relevant skills for a prompt, add skill guidance
to the agent turn, and execute a selected skill with scoped tools, connectors,
memory policy, safety checks, provenance, and audit logging.

## Skill Packages

Skills live under Friday's private skills directory after import. A package is
recognized from a skill markdown file with frontmatter and instructions. The
loader normalizes ids, names, descriptions, category, tags, versions,
visibility, safety level, dependencies, examples, input/output schemas, allowed
tools, required tools, required connectors, and resource directories.

Resource directories are limited to scripts, references, templates, and assets.
Large files, ignored build/cache directories, excessive file counts, and unsafe
package shapes are skipped or reported as diagnostics.

## Registry

The registry stores skills by id and version. It normalizes ids, rejects
duplicates, returns the latest version when no version is requested, supports
search by metadata, can list by category, and can enable or disable individual
skills.

When a skill is registered, dependency checks run immediately. Missing
dependencies are reported as warnings so the skill remains visible but its
execution can still be blocked later if required capabilities are unavailable.

## Discovery

Before an agent turn, the skills service can discover matching skills for the
user prompt. Discovery builds a context from the user id, session id, available
tools, available connectors, permissions, memory kinds, user preferences, and
prior skill success rates.

Each enabled, non-internal, safe skill is asked whether it can handle the
intent. Matching skills are ranked and capped. The selector then decides
whether to use one skill, compose several, ask for clarification, refuse unsafe
use, or answer directly when no authorized skill matches.

Discovered skills with local paths are exposed to the prompt so the agent can
read their instructions when they are relevant. Skills without local paths can
be executed through the `execute_skill` tool when that tool is available.

## Execution

Skill execution validates input against the skill schema, runs safety checks,
scopes the available tools and connectors to the skill contract, applies
timeouts and retries, records provenance, validates successful output, updates
preference success state, and writes an audit record.

The execution context can provide tool calls, connector calls, memory reads,
memory writes, nested skill execution, logging, cancellation, and access to the
current skill depth and provenance chain.

Workflow composition executes skill steps in dependency order, skips steps with
failed dependencies, and tries configured fallback skills when a step fails.

## Safety

Skill safety blocks disabled skills, excessive nesting, recursive execution,
missing required tools, missing required connectors, globally disallowed tools
or connectors, and prompt-injection-like inputs when they appear in direct
skill input.

Tool use inside a skill must be included in the skill's required or allowed
tools. Connector use must be included in the skill's required or allowed
connectors and the connector must expose the requested tool.

Imported skill files and generated outputs should be treated as untrusted until
reviewed. Skills should not be used to bypass normal tool approval, filesystem,
network, channel, connector, or credential boundaries.
