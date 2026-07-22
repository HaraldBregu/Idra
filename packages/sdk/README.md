# @friday/sdk

Demo scoped public npm package.

## Usage

```js
import { hello } from '@friday/sdk'

hello()          // "Hello, world! — from @friday/sdk"
hello('Friday')  // "Hello, Friday! — from @friday/sdk"
```

Run the demo locally:

```sh
npm run demo
```

## Publishing

Scoped packages are private by default. Publish as public with:

```sh
npm publish --access public
```

`publishConfig.access` is already set to `public` in `package.json`, so a plain
`npm publish` also works once you're logged in (`npm login`) and own the
`@friday` scope.
