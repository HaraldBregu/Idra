// ---------------------------------------------------------------------------
// Preload Process Types
// ---------------------------------------------------------------------------
// Types that are specific to the preload script context.
//
// The preload script runs in a privileged context with access to both Node.js
// and browser APIs, bridging main ↔ renderer via contextBridge.
//
// Most preload-relevant types come from:
//   - src/preload/index.d.ts  — window API surface (AppApi, WindowApi)
//   - src/shared/types/       — shared IPC types imported by preload
//
// Add preload-specific helper or internal types here if they grow beyond what
// belongs in index.d.ts (e.g. internal factory types, middleware types).
// ---------------------------------------------------------------------------

// Re-export the public window API types so preload internals can import
// from a single location without reaching into index.d.ts directly.
export type { WindowApi, AppApi } from './index.d';
