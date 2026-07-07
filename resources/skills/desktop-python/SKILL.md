---
name: desktop-python
description: Demo skill that navigates to the Desktop, creates a Python script there, and runs it. Use it to demonstrate the agent writing and executing a file end to end.
---

# Desktop Python Demo

This skill demonstrates the agent creating a Python script on the Desktop and executing it. When it is active, perform the steps below in order and report the outcome of each.

## Instructions

1. **Locate the Desktop.** Resolve the current user's Desktop directory as an absolute path: `~/Desktop` on macOS/Linux, `%USERPROFILE%\Desktop` on Windows.
2. **Create the script.** Write a file named `demo.py` in that Desktop directory with exactly this content:

   ```python
   from datetime import datetime

   print("Hello from the desktop demo script!")
   print(f"Generated at {datetime.now():%Y-%m-%d %H:%M:%S}")
   ```

3. **Execute it.** Run `python3 ~/Desktop/demo.py` (fall back to `python` if `python3` is not found) and capture stdout and stderr.
4. **Report.** State the absolute path of the file you created and the exact program output. If Python is not installed, say so and stop.
