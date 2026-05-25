# open_browser

`open_browser` opens a web page for the user.

## Tool Search Description

Use `open_browser` to open a safe, relevant web page in the user's browser when the user needs to view it directly.

## Use For

- Account setup or consent pages.
- Local app URLs.
- Pages the user needs to view directly.

## Do Not Use For

- Inspecting or controlling the page.
- External account actions without user intent.

## When It Fails

If the browser cannot open the page, report the URL and reason. Do not assume the user saw the page.

## Keep In Mind

Opening a browser changes the user's environment. Open only relevant and safe pages.
