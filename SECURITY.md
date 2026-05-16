# Security Policy

## Supported Version

Security fixes are accepted for the current `main` branch. Released desktop packages should be rebuilt from a commit that passes CI.

## Reporting a Vulnerability

Do not open public issues for exploitable vulnerabilities or leaked secrets. Report privately to the repository owner with:

- affected version or commit
- reproduction steps
- impact and affected data
- whether credentials, tokens, files, connectors, channels, or local workspace data are exposed

## Security Standards

- Keep Electron renderer processes sandboxed with `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, and `allowRunningInsecureContent: false`.
- Expose only narrow preload APIs through `contextBridge`; never expose raw Electron, filesystem, shell, or process objects to the renderer.
- Validate and authorize IPC inputs in the main process. Renderer validation is UX only.
- Treat provider API keys, connector credentials, tokens, chat history, workspace paths, and channel configuration as sensitive.
- Never log secrets. Redact credentials before logging errors, telemetry, audit entries, or agent output.
- Dangerous actions must require explicit user intent: file deletion, external publishing, connector writes, credential changes, shell execution, and app-folder operations.
- New dependencies must be justified, maintained, and covered by Dependabot or equivalent review.

## Release Expectations

- CI passes for typecheck, lint, and tests.
- Dependency updates and advisories are reviewed before release.
- Desktop signing/notarization settings are verified for the target platform.
- Release notes identify security-relevant changes and any migration impact.
