export function hello(name = 'world') {
  return `Hello, ${name}! — from @friday/sdk`
}

// ponytail: run `npm run demo` to see it; doubles as a runnable smoke check
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(hello())
  console.log(hello('Friday'))
}
