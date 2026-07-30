# @friday/cli

Command-line and terminal interface for Friday.

## Install

```sh
npm install --global @friday/cli
```

Node.js 22.12 or newer is required.

## Commands

```sh
friday                         # Launch the Friday desktop app
friday app                     # Launch the Friday desktop app explicitly
friday install package-one     # Install a Friday plugin from npm
friday install ./my-plugin     # Install a local plugin directory
friday install package-one -f  # Replace an installed plugin with the same id
friday tui                     # Open the interactive terminal interface
```

Inside `friday tui`, use:

```text
/install package-one
/app
/help
/clear
/quit
```

`/install` is a TUI command. In a normal shell, use `friday install <package>`.

## Plugin installation

The package spec is resolved with `npm pack --ignore-scripts`. No package lifecycle scripts are run.
The archive must contain a Friday plugin `manifest.json`. Its manifest ID determines the install
folder:

```text
<Friday userData>/plugins/<plugin-id>/
```

The manifest and every contributed file are validated before the staged directory is renamed into
place. Existing plugins are left untouched unless `--force` is passed. Restart Friday after an
install so all contribution registries reload.

Use `--data-dir <path>` to target a non-default Friday data directory. Use `FRIDAY_APP_PATH` when the
desktop executable is in a custom location, including a downloaded Linux AppImage.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
npm link
```
