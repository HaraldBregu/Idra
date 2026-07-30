# Releasing Friday

Friday uses one npm workspace and one repository for three independently versioned products:

| Product      | Manifest                    | Release tag  | Destination          |
| ------------ | --------------------------- | ------------ | -------------------- |
| Electron app | `package.json`              | `v1.2.3`     | GitHub Release       |
| SDK          | `packages/sdk/package.json` | `sdk-v1.2.3` | npm as `@friday/sdk` |
| CLI          | `packages/cli/package.json` | `cli-v1.2.3` | npm as `@friday/cli` |

`packages/examples/projects` is a standalone example fixture. It is intentionally not a
workspace and keeps its own lockfile.

## Local verification

Install every workspace from the repository root:

```sh
npm ci
npm run typecheck
npm run build
npm run test:packages
npm run build:packages
npm pack --dry-run --workspace @friday/sdk
npm pack --dry-run --workspace @friday/cli
```

The root `package-lock.json` is authoritative for the app, SDK, and CLI. Do not create
lockfiles inside `packages/sdk` or `packages/cli`.

## Electron app

1. Update the root `version`.
2. Run the local verification commands.
3. Push the commit, then create and push the matching tag:

   ```sh
   git tag v1.2.3
   git push origin v1.2.3
   ```

The `Release Electron app` workflow validates that the tag exactly matches the root
manifest, builds on native macOS, Windows, and Linux runners, and creates one GitHub
Release after all builds pass.

Production desktop releases require these GitHub Actions secrets:

| Platform           | Secret                                                     |
| ------------------ | ---------------------------------------------------------- |
| macOS              | `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`                     |
| macOS notarization | `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` |
| Windows            | `WIN_CSC_LINK`, `WIN_CSC_KEY_PASSWORD`                     |

`MAC_CSC_LINK` and `WIN_CSC_LINK` may contain the appropriate base64-encoded certificate
or a secure URL supported by electron-builder. Signing is mandatory so a missing or
invalid credential stops the release.

## SDK and CLI

Each package has its own version. Update only the manifest for the package being released,
run the local verification commands, and push the matching tag:

```sh
git tag sdk-v1.2.3
git push origin sdk-v1.2.3

git tag cli-v1.2.3
git push origin cli-v1.2.3
```

The `Publish npm package` workflow maps the tag to exactly one workspace, checks that the
tag matches its manifest, tests and packs that workspace, then publishes it. It never uses
`npm publish --workspaces`, so adding another workspace cannot publish it accidentally.

### First npm publication

npm trusted publishing can only be configured after a package exists. Bootstrap each
package once from a protected maintainer machine:

```sh
npm login
npm publish --workspace @friday/sdk --access public
npm publish --workspace @friday/cli --access public
```

Before publishing, confirm that the `@friday` scope belongs to the intended npm account or
organization. After both packages exist:

1. Create a protected GitHub environment named `npm` and require a reviewer.
2. In each npm package's trusted publisher settings, select GitHub Actions.
3. Enter repository owner `HaraldBregu`, repository `friday`, workflow
   `npm-publish.yml`, and environment `npm`. These values are case-sensitive.
4. Run a tagged release and confirm that npm displays provenance.
5. Revoke any bootstrap token and remove it from GitHub if one was temporarily added.

The workflow uses short-lived OpenID Connect credentials and deliberately has no npm token.

## Recovery

- npm package versions are immutable. If a release is wrong, deprecate that version, fix
  the package, increment its version, and publish a new tag.
- Do not move an existing release tag. Fix the app, increment the root version, and create
  a new Electron release.
- A failed workflow can be rerun after correcting repository settings or secrets. If npm
  already contains the version, increment the package version instead of retrying publish.
