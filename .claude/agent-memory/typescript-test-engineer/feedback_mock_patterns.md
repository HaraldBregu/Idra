---
name: Mock patterns for Friday main-process tests
description: Patterns and gotchas for mocking Electron, Assistant, and shared mock functions in Jest
type: feedback
---

Use self-contained `jest.mock()` factories — never reference outer `const`/`let` variables inside the factory. Jest hoists `jest.mock()` calls before any variable declarations, so outer references result in "Cannot access before initialization" errors.

**Why:** Discovered when first test run hit `ReferenceError: Cannot access 'MockAssistant' before initialization`.

**How to apply:** Define all mock functions inside the `jest.mock(path, factory)` factory. Attach them as static properties on the mock class so tests can retrieve them after importing the mocked module. Example pattern used in `service.test.ts`:
```ts
jest.mock('....../assistant', () => {
  const mockSend = jest.fn();
  const MockAssistant = jest.fn().mockImplementation((id) => ({ id, send: mockSend }));
  MockAssistant._mockSend = mockSend; // expose for tests
  return { Assistant: MockAssistant };
});
// Then in test file:
const MockAssistant = Assistant as unknown as MockedCtor & { _mockSend: jest.MockedFunction<...> };
const mockSend = MockAssistant._mockSend;
```

**Shared mock functions across instances:** When a mock factory creates one `jest.fn()` and assigns it to all instances, the same function is called regardless of which instance `send()` was called on. Do NOT queue extra `mockResolvedValueOnce` values for constructor-path calls that don't invoke the shared function — only queue for the actual calls your test makes.

**Why:** Led to a test failure where an extra `.mockResolvedValueOnce('ignored')` was placed assuming the constructor's `ensure()` would call `send()`, which it does not.
