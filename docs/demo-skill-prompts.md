# Demo Skill Prompts

Friday includes demo Agent Skills under `resources/demo-skills`. Import that
folder from `Settings -> Skills -> Upload Skill` before using these prompts.

After a skill runs, the assistant chat should show a `Skill used` chip below
the assistant message.

## Research Brief

Use this prompt to test `research-brief` with a local document:

```text
Use the research-brief skill to create a concise research brief from docs/agent-skills.md. Include key findings, risks, and next steps.
```

Use this prompt to test saving the brief to a file:

```text
Use the research-brief skill to create a concise research brief from docs/agent-skills.md and write it to docs/research-brief-output.md. Include key findings, risks, and next steps.
```

Expected result:

- The assistant reads `resources/demo-skills/research-brief/SKILL.md` with `read`.
- The final answer is a short brief with findings, risks, and next steps, or confirms the saved output path when a file path is requested.
- The assistant message shows a `Skill used` chip for `research-brief`.

## Release Notes Drafter

Use this prompt to test `release-notes-drafter` against the repo history:

```text
Use the release-notes-drafter skill to draft user-facing release notes from the latest git commits in this repo.
```

Expected result:

- The assistant reads `resources/demo-skills/release-notes-drafter/SKILL.md` with `read`.
- The output groups changes into user-facing release note sections.
- The assistant message shows a `Skill used` chip for `release-notes-drafter`.

## Data Quality Check

Create or choose a CSV file, then replace the path in this prompt:

```text
Use the data-quality-check skill to inspect /path/to/file.csv for missing values, duplicate headers, and import blockers.
```

Expected result:

- The assistant reads `resources/demo-skills/data-quality-check/SKILL.md` with `read`.
- The output reports schema, missing-value, duplicate, and import-readiness issues.
- The assistant message shows a `Skill used` chip for `data-quality-check`.

Optional quick CSV fixture:

```csv
id,name,email,email
1,Ada,ada@example.com,ada@example.com
2,,missing-name@example.com,missing-name@example.com
2,Grace,grace@example.com,grace@example.com
```

Save that as a temporary `.csv` file and point the prompt at it.
