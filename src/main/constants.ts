// ---------------------------------------------------------------------------
// Main Process Constants
// ---------------------------------------------------------------------------
// Central location for constants used across the main process.
//
// Context-specific constants that only make sense within their own module
// (e.g. LOG_PREFIX strings, private retry limits) remain co-located with
// their implementation.  This file collects constants that are referenced
// from multiple main-process modules or that document important boundaries.
//
// DO NOT import Electron APIs that are only available after app.whenReady().
// Pure string/number/boolean literals are safe to define at module scope.
// ---------------------------------------------------------------------------

// ---- File system ---------------------------------------------------------

/** Proprietary project file extension for this application. */
export const WORKSPACE = '.json';
