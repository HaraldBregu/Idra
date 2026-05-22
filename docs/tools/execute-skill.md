# execute_skill

`execute_skill` runs an executable skill selected for the current request.

## How It Is Used

- Used when skill discovery chooses a skill that should run as an action.
- Lets Friday apply a packaged workflow instead of handling everything directly
  in the base agent path.
- Keeps specialized behavior tied to the selected skill.

## Boundaries

- It appears only when a matching executable skill is selected.
- File-backed skills can be read directly and may not need this tool.
