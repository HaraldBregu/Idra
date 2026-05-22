# web_fetch

`web_fetch` reads text from a web address.

## How It Is Used

- Used when Friday needs the contents of a specific page or resource.
- Helps answer questions that depend on external documentation or page text.
- Keeps the result inside the agent conversation instead of opening a browser.

## Boundaries

- It should only fetch addresses relevant to the request.
- Tool output from the web is treated as untrusted context.
