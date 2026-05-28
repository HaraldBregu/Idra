# web_fetch

`web_fetch` reads text from an HTTP or HTTPS address.

## How It Is Used

- Used when Friday needs the contents of a specific page or resource.
- Helps answer questions that depend on external documentation or page text.
- Keeps the result inside the agent conversation instead of opening a browser.
- For HTML responses, strips `<script>` and `<style>` blocks, all remaining
  tags, and common HTML entities before returning the text.
- Response is capped at 1 MB regardless of the actual content size.

## Boundaries

- Only `http://` and `https://` URLs are accepted; other schemes are rejected.
- It reads web content and does not directly change workspace or external files.
- It should only fetch addresses relevant to the request.
- Tool output from the web is treated as untrusted context.
