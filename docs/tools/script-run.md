# script_run

`script_run` executes an existing script file with optional string arguments. It is for deliberate script execution, not for arbitrary shell command text.

## Dependencies

Depends on the [policy module](../policy/index.md). Before execution, the tool resolves the script path and working directory, then checks whether policy allows reading the script and writing in the working directory. Read-only filesystem policy disables the tool.

The tool shares the same path resolution and workspace-boundary policy helpers used by the file tools.

## Tool Selection Description

Use `script_run` when the user asks to run an existing script, Python file, Node script, shell script, or similar local automation and the script file path is known or can be found.

## Use For

- Running a project script file that already exists.
- Running a Python, Node, Bash, or shell script with explicit arguments.
- Capturing stdout, stderr, exit code, signal, timeout state, and output truncation metadata.

## Do Not Use For

- Running arbitrary command strings.
- Running host schedulers such as `crontab`.
- Installing dependencies or changing system state unless the user clearly requested it and policy allows the paths involved.
- Bypassing file policy by invoking another executable directly.

## Inputs

- `path`: absolute or workspace-relative script path.
- `args`: optional string array passed without shell interpolation.
- `cwd`: optional working directory. Defaults to the workspace.
- `interpreter`: optional `auto`, `bash`, `sh`, `python3`, or `node`.
- `timeoutMs`: optional timeout, capped by the tool.
- `maxOutputBytes`: optional stdout and stderr capture cap, capped by the tool.

## When It Fails

The tool fails when policy denies the script path or working directory, read-only filesystem policy is active, the path is not a file, the working directory is not a directory, the interpreter cannot be inferred, the process times out, or the process exits with a non-zero code.

Report the exit code, stderr, and timeout state. Do not treat partial output as a successful run.
