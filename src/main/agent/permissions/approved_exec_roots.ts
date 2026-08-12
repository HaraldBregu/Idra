import { AsyncLocalStorage } from 'node:async_hooks';

export const approvedExecRoots = new AsyncLocalStorage<readonly string[]>();
